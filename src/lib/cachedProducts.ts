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
        "id, title, price, image_url, url, product_type, tags, has_image, collection_handle, collection_url, synced_at",
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
// Opsætnings-siden) lægger et EKSTRA filter OVENPÅ ord-matchningen – ikke i
// stedet for den – så kun produkter med hasImage === true medtages, når
// slået til.

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
}

export async function searchCachedProductsByTopic(
  topic: string,
  onlyWithImage = false,
): Promise<TopicSearchResult> {
  const candidates = extractSearchWordCandidates(topic);

  if (candidates.length === 0) return { products: [], matchedWords: [] };

  const { products } = await getCachedProducts();
  const matchedProducts: ShopifyProduct[] = [];
  const matchedWords = new Set<string>();

  for (const product of products) {
    if (onlyWithImage && !product.hasImage) continue;
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

  return { products: matchedProducts, matchedWords: [...matchedWords] };
}
