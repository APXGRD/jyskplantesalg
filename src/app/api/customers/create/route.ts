// src/app/api/customers/create/route.ts
//
// POST: opretter en RIGTIG kunde i Shopify (customerCreate, se
// customerMutations.ts) – ALTID FØRST, af juridiske grunde (Shopify skal
// forblive den reelle kilde til samtykke-status). Kun EFTER et bekræftet,
// vellykket Shopify-kald opdateres cached_customers (upsertCachedCustomer) –
// fejler Shopify-kaldet, røres cachen slet ikke.

import { NextRequest, NextResponse } from "next/server";
import { createShopifyCustomer } from "@/lib/shopify/customerMutations";
import { upsertCachedCustomer } from "@/lib/cachedCustomers";
import { requireUser } from "@/lib/supabase/requireUser";
import type { CustomerType } from "@/lib/format";

interface CreateCustomerBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  customerType?: CustomerType;
}

function isCustomerType(value: unknown): value is CustomerType {
  return value === "privat" || value === "erhverv";
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: CreateCustomerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "Fornavn, efternavn og email er påkrævet" }, { status: 400 });
  }
  if (!isCustomerType(body.customerType)) {
    return NextResponse.json({ error: "customerType skal være 'privat' eller 'erhverv'" }, { status: 400 });
  }

  let customer;
  try {
    customer = await createShopifyCustomer({ firstName, lastName, email, customerType: body.customerType });
  } catch (err) {
    console.error("Kunne ikke oprette kunden i Shopify:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke oprette kunden i Shopify." },
      { status: 502 },
    );
  }

  // Shopify-kaldet lykkedes – opdatér cachen med det samme. Fejler DETTE
  // trin (Supabase midlertidigt utilgængelig osv.), er kunden stadig
  // korrekt oprettet i Shopify (den reelle kilde); kun selve
  // cache-opdateringen mangler, og retter sig selv ved næste "Synkroniser
  // kunder" eller enkelt-kunde-opdatering. Fejler derfor IKKE hele kaldet
  // her – kalderen skal se den vellykkede oprettelse.
  try {
    await upsertCachedCustomer(customer);
  } catch (err) {
    console.error("Kunden blev oprettet i Shopify, men kunne ikke caches i Supabase:", err);
  }

  return NextResponse.json(customer);
}
