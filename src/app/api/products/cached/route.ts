// src/app/api/products/cached/route.ts
//
// GET: læser produkter fra Supabases cached_products-tabel – INGEN
// Shopify-kald, bruges af klientside-genindlæsning (efter en
// synkronisering, eller fejl-retry) på "Vælg produkter"-siden. Selve
// FØRSTE sideindlæsning læser i stedet direkte via getCachedProducts() i en
// Server Component (se produkter/page.tsx), uden denne ekstra HTTP-tur-
// retur. Cachen fyldes/opdateres udelukkende via /api/shopify/sync-products
// (Synkroniser produkter-knappen).

import { NextResponse } from "next/server";
import { getCachedProducts } from "@/lib/cachedProducts";

export async function GET() {
  try {
    const result = await getCachedProducts();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Kunne ikke hente cachede produkter fra Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente produkter." },
      { status: 502 },
    );
  }
}
