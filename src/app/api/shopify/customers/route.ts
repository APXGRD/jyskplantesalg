// src/app/api/shopify/customers/route.ts
//
// Bruges af Kunder-siden (via src/lib/customers.ts) til at hente RIGTIGE
// kunder fra Shopify.

import { NextResponse } from "next/server";
import { fetchShopifyCustomers } from "@/lib/shopify/fetchCustomers";
import { requireUser } from "@/lib/supabase/requireUser";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    const customers = await fetchShopifyCustomers();
    return NextResponse.json(customers);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukendt fejl ved hentning af Shopify-kunder." },
      { status: 502 },
    );
  }
}
