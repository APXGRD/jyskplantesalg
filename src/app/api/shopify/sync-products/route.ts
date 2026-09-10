// src/app/api/shopify/sync-products/route.ts
//
// POST: henter ALLE produkter fra Shopify (via den allerede paginerede
// fetchShopifyProducts(), uændret), og erstatter HELE cached_products-
// tabellens indhold med den friske liste – slet-så-indsæt i stedet for
// upsert, så cachen aldrig kan indeholde et produkt, kunden siden har
// slettet i Shopify. Kaldes kun manuelt (Synkroniser produkter-knappen på
// "Vælg produkter"-siden), ALDRIG ved almindelig sideindlæsning – det er
// netop pointen med cache-laget (se /api/products/cached, som er den route,
// selve siden læser fra).

import { NextResponse } from "next/server";
import { fetchShopifyProducts } from "@/lib/shopify/fetchProducts";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST() {
  try {
    const products = await fetchShopifyProducts();
    const supabase = getSupabaseClient();

    // Alle rækker har SAMME synced_at, så "Sidst opdateret"-visningen på
    // siden er entydig, i stedet for at afhænge af hver rækkes egen
    // (marginalt forskudte) DB-default-tidsstempel.
    const syncedAt = new Date().toISOString();
    const rows = products.map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.imageUrl,
      url: product.url,
      product_type: product.productType,
      tags: product.tags,
      has_image: product.hasImage,
      synced_at: syncedAt,
    }));

    // PostgREST kræver mindst ét filter på DELETE (ingen "slet alt uden
    // WHERE") – id er tabellens PK og derfor aldrig null, så dette filter
    // matcher reelt ALLE eksisterende rækker.
    const { error: deleteError } = await supabase.from("cached_products").delete().not("id", "is", null);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("cached_products").insert(rows);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return NextResponse.json({ success: true, count: rows.length, syncedAt });
  } catch (err) {
    console.error("Kunne ikke synkronisere produkter fra Shopify:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke synkronisere produkter. Prøv igen." },
      { status: 502 },
    );
  }
}
