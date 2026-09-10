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
  synced_at: string | null;
}

async function fetchAllCachedRows(): Promise<CachedProductRow[]> {
  const supabase = getSupabaseClient();
  const rows: CachedProductRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cached_products")
      .select("id, title, price, image_url, url, product_type, tags, has_image, synced_at")
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
