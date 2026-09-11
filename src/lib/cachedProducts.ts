// src/lib/cachedProducts.ts
//
// Serverside adgang til Supabases cached_products-tabel – ingen
// Shopify-kald, kun en almindelig DB-læsning. Bruges direkte af
// src/app/produkter/page.tsx (Server Component, ingen ekstra HTTP-tur-
// retur) OG af src/app/api/products/cached/route.ts (samme funktion, kaldt
// via HTTP – nødvendig for klientside genindlæsning efter en synkronisering
// og for fejl-retry, se ProduktvaelgerClient.tsx).

import { getSupabaseClient } from "@/lib/supabase";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { extractSearchWordCandidates, normalizeWord } from "@/lib/searchWords";

// PostgREST begrænser som standard ét enkelt select-svar til 1000 rækker
// (db-max-rows), uanset det faktiske antal rækker i tabellen – uden denne
// side-løkke ville en cache på over 1000 produkter (som Jysk Plantesalgs
// 1374) blive tavst afkortet til de første 1000 her, selvom ALLE rækker
// rent faktisk blev indsat korrekt af sync-products/route.ts.
const PAGE_SIZE = 1000;

interface CachedProductRow {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  url: string | null;
  product_type: string | null;
  tags: string[] | null;
  has_image: boolean;
  collection_handle: string | null;
  collection_url: string | null;
  plant_form: string | null;
  synced_at: string | null;
}

async function fetchAllCachedRows(): Promise<CachedProductRow[]> {
  const supabase = getSupabaseClient();
  const rows: CachedProductRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cached_products")
      .select(
        "id, title, price, image_url, url, product_type, tags, has_image, collection_handle, collection_url, plant_form, synced_at",
      )
      .order("title", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export interface CachedProductsResult {
  products: ShopifyProduct[];
  syncedAt: string | null;
}

export async function getCachedProducts(): Promise<CachedProductsResult> {
  const rows = await fetchAllCachedRows();

  const products: ShopifyProduct[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    price: row.price,
    imageUrl: row.image_url ?? "",
    url: row.url ?? "",
    productType: row.product_type ?? "",
    tags: row.tags ?? [],
    hasImage: row.has_image,
    collectionHandle: row.collection_handle,
    collectionUrl: row.collection_url,
    plantForm: row.plant_form,
  }));

  // Alle rækker fra samme synkronisering deler samme synced_at (sat af
  // sync-products/route.ts) – den nyeste af dem er derfor tidspunktet for
  // sidste FULDE synkronisering. Er cachen tom, er der aldrig synkroniseret.
  const syncedAt = rows.reduce<string | null>((latest, row) => {
    if (!row.synced_at) return latest;
    if (!latest || row.synced_at > latest) return row.synced_at;
    return latest;
  }, null);

  return { products, syncedAt };
}

// Alle unikke, ikke-tomme plantForm-værdier (vækstform – Multistammet,
// Søjleformet, Tagklippet osv., fra Shopifys custom.planteform-metafelt, se
// fetchProducts.ts) i cachen, alfabetisk sorteret (dansk sortering) – bruges
// til Opsætnings-sidens "Planteform"-dropdown (se OpsaetningClient.tsx), det
// ENESTE strukturerede filter på siden (product_type-baserede "Plantesort"-
// filteret er fjernet igen – product_type indgår fortsat i selve
// fritekstsøgningen nedenfor, blot ikke længere som separat dropdown).
// Genbruger getCachedProducts direkte (samme fuldt paginerede cache, ingen
// separat Supabase-forespørgsel/pagineringslogik at holde synkron med den).
export async function getCachedPlantForms(): Promise<string[]> {
  const { products } = await getCachedProducts();
  const forms = new Set<string>();
  for (const product of products) {
    const trimmed = product.plantForm?.trim();
    if (trimmed) forms.add(trimmed);
  }
  return [...forms].sort((a, b) => a.localeCompare(b, "da"));
}

// Simpel, DETERMINISTISK tekstsøgning (ingen AI involveret) – bruges af
// generate-newsletter/route.ts, når Opsætnings-sidens samlede felt
// ("Beskriv dit nyhedsbrev") er udfyldt OG intet produkt er manuelt valgt,
// i stedet for at slå manuelt valgte produkt-id'er op. Understøtter
// en hel, naturlig sætning: splitter emne-teksten op i enkeltord, fjerner
// danske fyld-ord (DANISH_STOP_WORDS), og matcher et produkt, hvis dets
// title, productType ELLER tags indeholder MINDST ÉT af de resterende,
// meningsfulde ord (efter samme bøjnings-normalisering, se normalizeWord)
// som delstreng – case-insensitivt. Ingen grænse på antal matches; læser fra
// den samme cache som al anden produkt-hentning (ingen Shopify-kald).
//
// onlyWithImage (default false, samme "Kun med billede"-kontakt som på
// Opsætnings-siden) OG minPrice/maxPrice (samme "Min./Maks. pris"-felter)
// lægger EKSTRA AND-filtre OVENPÅ ord-matchningen – ikke i stedet for den –
// så kun produkter, der BÅDE matcher mindst ét søgeord OG opfylder disse
// filtre, medtages.

// Splitter en fritekst op i enkeltord (samme regel som selve søgeteksten
// splittes med) og normaliserer hvert ord for sig (normalizeWord, se
// searchWords.ts) – bruges til at bryde title/productType/tags op i
// sammenlignelige enkeltord, i stedet for at sammenligne mod HELE strengen
// som ét stykke (en endelse midt i en flerords-titel, fx "Ahorn" i "Japansk
// Ahorn", kan ellers ikke normaliseres korrekt for sig selv).
function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .map(normalizeWord);
}

export interface TopicSearchResult {
  // Det ENDELIGE produkt-sæt – EFTER både alle øvrige filtre OG en evt.
  // maxResults-afskæring (se options.maxResults herunder). ALTID alfabetisk
  // sorteret efter titel (dansk sortering), uanset om der reelt blev
  // afskåret eller ej, så rækkefølgen er forudsigelig i begge tilfælde.
  products: ShopifyProduct[];
  // De ORIGINALE (u-normaliserede) søgeord, der rent faktisk gav mindst ét
  // matchende produkt – IKKE blot alle ord, der overlevede stopords-
  // filtreringen uden selv at blive bekræftet. Fx "ahorns" (skrevet sådan i
  // feltet) rapporteres som "ahorns" her, ikke den normaliserede "ahorn",
  // som selve matchningen internt sammenlignede med. Bruges af
  // generate-newsletter/route.ts til at bygge CTA-knappens søgeside-
  // fallback-link (se resolveCtaLink i ctaLink.ts) ud fra kun de ord, der
  // faktisk gav resultat – et ord som "pæn", der overlevede stopords-
  // filtreringen men ikke matchede noget produkt, skal IKKE ende i linket.
  matchedWords: string[];
  // Antal produkter, der matchede ALLE øvrige filtre (tekst, pris,
  // planteform, billede), FØR maxResults-afskæringen blev anvendt – dvs.
  // `products.length` når intet blev afskåret, men STØRRE end
  // `products.length`, når maxResults reelt begrænsede resultatet. Bruges af
  // Opsætnings-sidens "X produkter matcher, viser de første N"-note (se
  // /api/products/topic-match-count/route.ts og OpsaetningClient.tsx).
  totalMatchCount: number;
}

// Standardgrænsen for "Maks. antal produkter"-feltet på Opsætnings-siden –
// ÉN kilde til sandhed for både serverens fallback (parseMaxResults
// herunder, når feltet mangler/er ugyldigt) og klientfeltets startværdi (se
// DEFAULT_PERSISTED_STATE i NewsletterContext.tsx, som IKKE kan importere
// denne fil direkte, da den trækker Supabase-klienten ind i klientbundlet –
// holdes derfor manuelt i sync med kommentar-henvisning begge steder).
export const DEFAULT_TOPIC_MAX_RESULTS = 1;

// Et brugbart, positivt heltal (min. 1) – ellers DEFAULT_TOPIC_MAX_RESULTS,
// så et manglende/ugyldigt felt altid falder tilbage til en fornuftig,
// automatisk grænse i stedet for enten at fejle eller (utilsigtet) fjerne
// grænsen helt.
export function parseMaxResults(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.floor(value);
    if (rounded >= 1) return rounded;
  }
  return DEFAULT_TOPIC_MAX_RESULTS;
}

// Valgfrit prisinterval (begge grænser inklusive), fra Opsætnings-sidens
// "Min. pris"/"Maks. pris"-felter ved siden af "Kun med billede"-kontakten –
// tomt/undefined betyder "intet filter på den grænse". Er kun ÉN af de to
// udfyldt, filtreres der kun på den ene grænse, som hidtil beskrevet.
// plantForm (fra "Planteform"-dropdownen) er et EKSAKT match mod
// product.plantForm, ikke endnu en ord-matchning – undefined/tom streng
// betyder "intet filter". product_type indgår fortsat i selve
// ord-matchningen herunder (se tokenizeAndNormalize-brugen), men er IKKE
// længere et separat, strukturelt AND-filter for sig (det tidligere
// "Plantesort"-filter er fjernet).
// maxResults afskærer resultatet til de første N produkter (alfabetisk
// sorteret efter titel) EFTER alle øvrige filtre OG ord-matchningen –
// undefined betyder "ingen afskæring" (bruges af
// /api/products/topic-match-count/route.ts, som netop skal kende det FULDE,
// ufiltrerede antal). generate-newsletter/route.ts sender derimod altid en
// værdi (se parseMaxResults ovenfor).
export interface TopicSearchOptions {
  onlyWithImage?: boolean;
  minPrice?: number;
  maxPrice?: number;
  plantForm?: string;
  maxResults?: number;
}

export async function searchCachedProductsByTopic(
  topic: string,
  options: TopicSearchOptions = {},
): Promise<TopicSearchResult> {
  const { onlyWithImage = false, minPrice, maxPrice, plantForm, maxResults } = options;
  const candidates = extractSearchWordCandidates(topic);

  if (candidates.length === 0) return { products: [], matchedWords: [], totalMatchCount: 0 };

  const { products } = await getCachedProducts();
  const matchedProducts: ShopifyProduct[] = [];
  const matchedWords = new Set<string>();

  for (const product of products) {
    if (onlyWithImage && !product.hasImage) continue;
    if (typeof minPrice === "number" && product.price < minPrice) continue;
    if (typeof maxPrice === "number" && product.price > maxPrice) continue;
    if (plantForm && product.plantForm !== plantForm) continue;
    const titleWords = tokenizeAndNormalize(product.title);
    const productTypeWords = tokenizeAndNormalize(product.productType);
    const tagWords = product.tags.flatMap(tokenizeAndNormalize);
    const haystack = [...titleWords, ...productTypeWords, ...tagWords];

    // Afprøver ALLE kandidat-ord mod dette produkt (ikke kun det første, der
    // matcher) – et andet produkt kunne ellers være den ENESTE bekræftelse
    // for et senere kandidat-ord, som aldrig ville blive tjekket, hvis
    // løkken stoppede ved produktets første træf.
    let productMatched = false;
    for (const candidate of candidates) {
      if (haystack.some((haystackWord) => haystackWord.includes(candidate.normalized))) {
        productMatched = true;
        matchedWords.add(candidate.original);
      }
    }
    if (productMatched) matchedProducts.push(product);
  }

  // Alfabetisk (dansk sortering), så resultatet er forudsigeligt og
  // testbart – IKKE en påstået "bedste"/mest populære udvælgelse, siden der
  // ikke findes et pålideligt popularitets-/bestseller-signal i de rigtige
  // Shopify-data. Sorteres eksplicit her, i stedet for at stole på, at
  // getCachedProducts allerede returnerer rækkerne i denne rækkefølge.
  matchedProducts.sort((a, b) => a.title.localeCompare(b.title, "da"));

  const totalMatchCount = matchedProducts.length;
  const truncatedProducts =
    typeof maxResults === "number" ? matchedProducts.slice(0, maxResults) : matchedProducts;

  return { products: truncatedProducts, matchedWords: [...matchedWords], totalMatchCount };
}
