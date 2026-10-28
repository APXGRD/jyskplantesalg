// Fælles, klient-sikre hjælpere til produkt-cachen (cached_products) – ingen
// Supabase/server-afhængigheder, så de kan bruges både serverside
// (cachedProducts.ts, opsaetning/page.tsx) og i browseren (OpsaetningClient).

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";

// Er produkt-cachen ældre end dette, synkroniseres den automatisk fra Shopify,
// når Opsætning åbnes – så nyhedsbreve altid bygger på nogenlunde friske
// produkter (nye produkter, priser, billeder og slettede varer).
export const PRODUCT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// true = cachen har aldrig været synkroniseret, eller er ældre end
// PRODUCT_CACHE_MAX_AGE_MS.
export function isProductCacheStale(syncedAt: string | null, now: number = Date.now()): boolean {
  if (!syncedAt) return true;
  const time = new Date(syncedAt).getTime();
  return Number.isNaN(time) || now - time > PRODUCT_CACHE_MAX_AGE_MS;
}

// Alle unikke, ikke-tomme planteformer (custom.planteform-metafeltet),
// alfabetisk sorteret efter dansk sortering – Opsætnings "Planteform"-filter.
export function extractPlantForms(products: Pick<ShopifyProduct, "plantForm">[]): string[] {
  const forms = new Set<string>();
  for (const product of products) {
    const trimmed = product.plantForm?.trim();
    if (trimmed) forms.add(trimmed);
  }
  return [...forms].sort((a, b) => a.localeCompare(b, "da"));
}
