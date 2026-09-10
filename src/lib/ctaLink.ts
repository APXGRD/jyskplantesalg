// src/lib/ctaLink.ts
//
// CENTRAL, delt funktion til at udregne CTA-knappens link ud fra en liste af
// produkter – deterministisk, ingen AI involveret. Bruges BÅDE server-side
// (generate-newsletter/route.ts, ved selve genereringen) OG client-side
// (EditorBlockList.tsx, hver gang produktvalget i Produktvisnings- eller
// billede-/galleri-blokken ændres i Edit-mode) – præcis SAMME logik begge
// steder, så CTA-linket altid er korrekt, uanset hvornår det udregnes.

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";

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
// - Flere produkter uden en fælles collection (fx en bred emne-søgning på
//   tværs af kategorier, eller intet af dem er medlem af nogen collection):
//   fald tilbage til det først valgte produkts egen URL – IKKE et
//   kategori-link, der ikke reelt dækker alt det viste.
export function resolveCtaLink(products: ShopifyProduct[]): string {
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
  return primaryUrl;
}
