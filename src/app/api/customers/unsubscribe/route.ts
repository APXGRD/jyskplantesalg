// src/app/api/customers/unsubscribe/route.ts
//
// POST: afmelder en RIGTIG kundes e-mail-markedsføring i Shopify
// (customerEmailMarketingConsentUpdate, se customerMutations.ts) – ALTID
// FØRST, af juridiske grunde (Shopify skal forblive den reelle kilde til
// samtykke-status). Kun EFTER et bekræftet, vellykket Shopify-kald
// opdateres cached_customers (upsertCachedCustomer) – fejler Shopify-kaldet,
// røres cachen slet ikke, og kunden forbliver "Aktiv" i UI'et (se
// KunderClient.tsx's optimistiske opdatering-med-rollback).
//
// customerId sendes i JSON body (IKKE som en dynamisk rute-segment,
// "[id]") – kundens id er en fuld Shopify GID (fx
// "gid://shopify/Customer/123"), som indeholder skråstreger og derfor ikke
// kan bruges direkte som ét enkelt rute-segment.

import { NextRequest, NextResponse } from "next/server";
import { unsubscribeShopifyCustomer } from "@/lib/shopify/customerMutations";
import { upsertCachedCustomer } from "@/lib/cachedCustomers";
import { requireUser } from "@/lib/supabase/requireUser";

interface UnsubscribeCustomerBody {
  customerId?: string;
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: UnsubscribeCustomerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  if (!customerId) {
    return NextResponse.json({ error: "customerId mangler" }, { status: 400 });
  }

  let customer;
  try {
    customer = await unsubscribeShopifyCustomer(customerId);
  } catch (err) {
    console.error("Kunne ikke afmelde kunden i Shopify:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke afmelde kunden i Shopify." },
      { status: 502 },
    );
  }

  // Se samme begrundelse som customers/create/route.ts: fejler kun
  // cache-opdateringen (Shopify-kaldet er allerede lykkedes), skal
  // kalderen stadig se den vellykkede afmelding.
  try {
    await upsertCachedCustomer(customer);
  } catch (err) {
    console.error("Kunden blev afmeldt i Shopify, men kunne ikke caches i Supabase:", err);
  }

  return NextResponse.json(customer);
}
