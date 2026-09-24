// src/app/api/customers/cached/route.ts
//
// GET: læser kunder fra Supabases cached_customers-tabel – INGEN
// Shopify-kald, bruges af klientside-genindlæsning (efter en
// synkronisering, en tilføjelse/afmelding, eller fejl-retry) på
// Kunder-siden. Selve FØRSTE sideindlæsning læser i stedet direkte via
// getCachedCustomers() i en Server Component (se kunder/page.tsx), uden
// denne ekstra HTTP-tur-retur. Samme mønster som
// products/cached/route.ts.

import { NextResponse } from "next/server";
import { getCachedCustomers } from "@/lib/cachedCustomers";
import { requireUser } from "@/lib/supabase/requireUser";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    const result = await getCachedCustomers();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Kunne ikke hente cachede kunder fra Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente kunder." },
      { status: 502 },
    );
  }
}
