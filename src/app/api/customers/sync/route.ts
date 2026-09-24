// src/app/api/customers/sync/route.ts
//
// POST: henter ALLE kunder fra Shopify (via den allerede paginerede
// fetchShopifyCustomers(), uændret), og erstatter HELE cached_customers-
// tabellens indhold med den friske liste – slet-så-indsæt i stedet for
// upsert, så cachen aldrig kan indeholde en kunde, der siden er slettet i
// Shopify. Kaldes kun manuelt ("Synkroniser kunder"-knappen på Kunder-siden),
// til brug hvis nogen har ændret noget direkte i Shopifys egen admin, uden
// om appen – almindelige tilføj/afmeld-handlinger i appen opdaterer i
// stedet cachen øjeblikkeligt, én kunde ad gangen (se
// customers/create og customers/unsubscribe). Samme mønster som
// shopify/sync-products/route.ts, blot for kunder.

import { NextResponse } from "next/server";
import { fetchShopifyCustomers } from "@/lib/shopify/fetchCustomers";
import { getCustomerType } from "@/lib/customers";
import { getSupabaseClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase/requireUser";

export async function POST() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    const customers = await fetchShopifyCustomers();
    const supabase = getSupabaseClient();

    // Alle rækker har SAMME synced_at, så "Sidst opdateret"-visningen på
    // siden er entydig for selve synkroniseringen – enkeltvise
    // upsertCachedCustomer-opdateringer (se customers/create/
    // unsubscribe) sætter derimod deres EGEN, senere synced_at pr. kunde,
    // hvilket er korrekt: den reflekterer netop hvornår DEN kunde sidst
    // blev bekræftet mod Shopify.
    const syncedAt = new Date().toISOString();
    const rows = customers.map((customer) => ({
      id: customer.id,
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      customer_type: getCustomerType(customer),
      marketing_consent_status: customer.marketingConsentStatus,
      synced_at: syncedAt,
    }));

    // PostgREST kræver mindst ét filter på DELETE (ingen "slet alt uden
    // WHERE") – id er tabellens PK og derfor aldrig null, så dette filter
    // matcher reelt ALLE eksisterende rækker.
    const { error: deleteError } = await supabase.from("cached_customers").delete().not("id", "is", null);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("cached_customers").insert(rows);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return NextResponse.json({ success: true, count: rows.length, syncedAt });
  } catch (err) {
    console.error("Kunne ikke synkronisere kunder fra Shopify:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke synkronisere kunder. Prøv igen." },
      { status: 502 },
    );
  }
}
