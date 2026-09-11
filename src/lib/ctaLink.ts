// src/lib/ctaLink.ts
//
// CENTRAL, delt funktion til at udregne CTA-knappens link ud fra en liste af
// produkter – deterministisk, ingen AI involveret. Bruges BÅDE server-side
// (generate-newsletter/route.ts, ved selve genereringen) OG client-side
// (EditorBlockList.tsx, hver gang produktvalget i Produktvisnings- eller
// billede-/galleri-blokken ændres i Edit-mode) – præcis SAMME logik begge
// steder, så CTA-linket altid er korrekt, uanset hvornår det udregnes.

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";

// Bygger butikkens egen søgeresultat-side for emne-søgeordet – domænet
// udledes af et af de faktisk viste produkters egen URL (samme rigtige,
// kunde-vendte domæne, produktets/collection'ens link allerede bruger,
// se fetchShopifyProducts/mapProductNode), i stedet for at kræve endnu en
// separat kilde til shop-domænet. Returnerer null, hvis intet produkt har en
// brugbar URL at udlede domænet fra (bør reelt aldrig ske – url er aldrig
// tom for et rigtigt Shopify-produkt), så kalderen kan falde videre tilbage.
function buildTopicSearchUrl(topic: string, products: ShopifyProduct[]): string | null {
  try {
    const origin = new URL(products[0].url).origin;
    return `${origin}/search?q=${encodeURIComponent(topic)}&type=product`;
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
//   en emne-søgning (topic er udfyldt, se generate-newsletter/route.ts og
//   NewsletterContext's topicSearchTerm): butikkens egen søgeside for
//   emne-ordet – dækker hele det viste udvalg, selvom det spænder over flere
//   collections, i stedet for at pege snævert på ét enkelt af dem.
// - Ingen af ovenstående (fx et almindeligt, manuelt "Vælg produkter"-flow
//   uden noget emne-ord at falde tilbage på): fald tilbage til det først
//   valgte produkts egen URL – IKKE et kategori- eller søge-link, der ikke
//   reelt afspejler et bevidst, samlet valg.
export function resolveCtaLink(products: ShopifyProduct[], topic?: string | null): string {
  const primaryUrl = products[0].url;
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
  if (topic) {
    const searchUrl = buildTopicSearchUrl(topic, products);
    if (searchUrl) return searchUrl;
  }
  return primaryUrl;
}
