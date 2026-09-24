// src/app/api/customers/unsubscribe-by-email/route.ts
//
// POST: selvbetjenings-afmelding via en email, brugeren selv indtaster på
// den OFFENTLIGE /afmeld-side (linket i alle nyhedsbrevs footer, se
// getUnsubscribeUrl) – BEVIDST UDEN requireUser()-tjek, til forskel fra
// ALLE andre API-routes i appen. Dette er den ENESTE måde, en rigtig
// nyhedsbrevsmodtager (ikke en logget ind admin-bruger af selve appen) kan
// afmelde sig selv, og skal derfor være tilgængelig uden login – se også
// isPublicAuthRoute i src/lib/supabase/middleware.ts, som holder selve
// /afmeld-SIDEN uden for login-kravet på samme måde.
//
// Findes emailen ikke i Shopify, returneres PRÆCIS samme neutrale
// bekræftelse som ved en vellykket afmelding – afslører aldrig, om en given
// email overhovedet er en kunde, af hensyn til privatlivet.
//
// Shopify er ALTID den reelle kilde til samtykke-status, ligesom
// customers/unsubscribe/route.ts (den logget-ind-admin-version, keyed på
// customerId i stedet for email) – cached_customers opdateres først EFTER
// et bekræftet, vellykket Shopify-kald.

import { NextRequest, NextResponse } from "next/server";
import { findShopifyCustomerByEmail } from "@/lib/shopify/fetchCustomers";
import { unsubscribeShopifyCustomer } from "@/lib/shopify/customerMutations";
import { upsertCachedCustomer } from "@/lib/cachedCustomers";

interface UnsubscribeByEmailBody {
  email?: string;
}

export async function POST(req: NextRequest) {
  let body: UnsubscribeByEmailBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email er påkrævet" }, { status: 400 });
  }

  let customer;
  try {
    customer = await findShopifyCustomerByEmail(email);
  } catch (err) {
    console.error("Kunne ikke slå email op i Shopify (afmelding):", err);
    return NextResponse.json({ error: "Der skete en fejl. Prøv igen om lidt." }, { status: 502 });
  }

  // Findes emailen ikke: STADIG succes, se filens header-kommentar.
  if (!customer) {
    return NextResponse.json({ success: true });
  }

  try {
    const updated = await unsubscribeShopifyCustomer(customer.id);
    // Fejler kun cache-opdateringen (Shopify-kaldet er allerede lykkedes),
    // skal kalderen stadig se den vellykkede afmelding – samme mønster som
    // customers/unsubscribe/route.ts.
    try {
      await upsertCachedCustomer(updated);
    } catch (err) {
      console.error("Kunden blev afmeldt i Shopify, men kunne ikke caches i Supabase:", err);
    }
  } catch (err) {
    console.error("Kunne ikke afmelde kunden i Shopify:", err);
    return NextResponse.json({ error: "Der skete en fejl. Prøv igen om lidt." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
