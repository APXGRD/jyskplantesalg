// src/lib/ctaLink.ts
//
// CENTRAL, delt funktion til at udregne CTA-knappens link ud fra en liste af
// produkter – deterministisk, ingen AI involveret. Bruges BÅDE server-side
// (generate-newsletter/route.ts, ved selve genereringen) OG client-side
// (EditorBlockList.tsx, hver gang produktvalget i Produktvisnings- eller
// billede-/galleri-blokken ændres i Edit-mode) – præcis SAMME logik begge
// steder, så CTA-linket altid er korrekt, uanset hvornår det udregnes.

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";

// Bygger butikkens egen søgeresultat-side for de BEKRÆFTET-matchende
// søgeord – domænet udledes af et af de faktisk viste produkters egen URL
// (samme rigtige, kunde-vendte domæne, produktets/collection'ens link
// allerede bruger, se fetchShopifyProducts/mapProductNode), i stedet for at
// kræve endnu en separat kilde til shop-domænet. Returnerer null, hvis intet
// produkt har en brugbar URL at udlede domænet fra (bør reelt aldrig ske –
// url er aldrig tom for et rigtigt Shopify-produkt), så kalderen kan falde
// videre tilbage.
//
// `matchedSearchWords` er IKKE den rå feltværdi og IKKE alle "ikke-stopord"
// fra sætningen – det er PRÆCIS de(t) ord, der rent faktisk gav mindst ét
// matchende produkt i selve søgningen (searchCachedProductsByTopic,
// cachedProducts.ts – se dens matchedWords), i deres OPRINDELIGE,
// u-normaliserede stavemåde (fx "ahorns", ikke den afkortede "ahorn", selve
// matchningen internt sammenlignede med). Renses/normaliseres IKKE yderligere
// her – det er allerede gjort, netop for at finde disse ord; at gøre det
// igen ville risikere at inkludere ord, der blot ikke blev filtreret fra,
// men aldrig selv gav noget resultat (fx "pæn").
function buildTopicSearchUrl(matchedSearchWords: string, products: ShopifyProduct[]): string | null {
  try {
    const origin = new URL(products[0].url).origin;
    return `${origin}/search?q=${encodeURIComponent(matchedSearchWords)}&type=product`;
  } catch {
    return null;
  }
}

// - 1 produkt: produktets egen URL.
// - Flere produkter, ALLE medlem af SAMME Shopify-collection (fx "vælg hele
//   Opstammet træer-kategorien", eller en emne-søgning, hvor alle
//   tilfældigvis matcher samme collection): collection'ens rigtige URL
//   (collectionUrl, hentet og cachet sammen med resten af produktdataen, se
//   fetchShopifyProducts) i stedet for ét enkelt produkt deri. Tidligere
//   brugte dette en fast, hardcodet productType->URL-opslagstabel
//   (collectionUrls i mockShopifyData.ts), som ALDRIG matchede det rigtige
//   katalogs productType-værdier – erstattet af produkternes egen, rigtige
//   collection-tilhørsforhold.
// - Flere produkter UDEN en fælles collection, MEN nyhedsbrevet stammer fra
//   en emne-søgning (matchedSearchWords er udfyldt – se
//   generate-newsletter/route.ts og NewsletterContext's topicSearchTerm,
//   begge sat ud fra searchCachedProductsByTopic's matchedWords, IKKE den rå
//   feltværdi): butikkens egen søgeside for de bekræftet-matchende ord –
//   dækker hele det viste udvalg, selvom det spænder over flere collections,
//   i stedet for at pege snævert på ét enkelt af dem.
// - Ingen af ovenstående (fx et almindeligt, manuelt "Vælg produkter"-flow
//   uden noget søgeord at falde tilbage på): fald tilbage til det først
//   valgte produkts egen URL – IKKE et kategori- eller søge-link, der ikke
//   reelt afspejler et bevidst, samlet valg.
export function resolveCtaLink(products: ShopifyProduct[], matchedSearchWords?: string | null): string {
  const primaryUrl = products[0].url;
  // PRÆCIS 1 produkt har ALTID topprioritet: dets egen URL, uanset om
  // nyhedsbrevet oprindeligt blev genereret via emne-søgning eller ej. Uden
  // dette eksplicitte tjek FØRST kunne søge-fallback'et herunder
  // (matchedSearchWords) fejlagtigt "vinde" – matchedSearchWords forbliver
  // sat fra selve genereringen, selvom brugeren siden har indsnævret
  // Edit-mode-valget ned til ét specifikt produkt, og var tidligere IKKE
  // beskyttet af noget længde-tjek (kun kategori-scenariet var).
  if (products.length === 1) {
    return primaryUrl;
  }
  const primaryCollectionHandle = products[0].collectionHandle;
  // .every() er trivielt sandt for et enkelt element, så "kategori-scenarie"
  // kræver EKSPLICIT også mere end ét produkt – ellers ville et enkelt
  // produkt fejlagtigt pege på hele kategori-siden i stedet for sin egen
  // produktside. primaryCollectionHandle skal desuden være sat (ikke null) –
  // "alle mangler collection" skal IKKE tælle som en fælles kategori.
  const isCategoryScenario =
    products.length > 1 &&
    primaryCollectionHandle !== null &&
    products.every((product) => product.collectionHandle === primaryCollectionHandle);
  if (isCategoryScenario) {
    return products[0].collectionUrl ?? primaryUrl;
  }
  if (matchedSearchWords) {
    const searchUrl = buildTopicSearchUrl(matchedSearchWords, products);
    if (searchUrl) return searchUrl;
  }
  return primaryUrl;
}
