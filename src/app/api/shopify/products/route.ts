// src/app/api/shopify/products/route.ts
//
// Bruges af "Vælg produkter"-siden, Preview-siden, NewsletterContext og
// generate-newsletter/route.ts til at hente RIGTIGE produkter fra Shopify.

import { NextResponse } from "next/server";
import { fetchShopifyProducts } from "@/lib/shopify/fetchProducts";
import { requireUser } from "@/lib/supabase/requireUser";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    const products = await fetchShopifyProducts();
    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukendt fejl ved hentning af Shopify-produkter." },
      { status: 502 },
    );
  }
}
