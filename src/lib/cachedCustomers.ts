// src/lib/cachedCustomers.ts
//
// Serverside adgang til Supabases cached_customers-tabel – ingen Shopify-kald,
// kun en almindelig DB-læsning/enkelt-række-skrivning. Samme mønster som
// cachedProducts.ts, men for kunder: Kunder-siden læser fra denne cache i det
// daglige (se kunder/page.tsx), ikke et direkte Shopify-kald ved hver
// sideindlæsning. Cachen holdes ajour på to måder:
// 1. upsertCachedCustomer herunder, kaldt UMIDDELBART efter hvert vellykket
//    Shopify-skrivekald (se customers/create og customers/unsubscribe
//    API-routes) – IKKE en separat, manuel synkroniseringsknap, da en enkelt
//    kunde-ændring skal afspejles øjeblikkeligt.
// 2. Den separate "Synkroniser kunder"-knap (se customers/sync/route.ts,
//    samme slet-og-genindsæt-mønster som sync-products/route.ts), til at
//    genopbygge HELE cachen, hvis nogen har ændret noget direkte i Shopifys
//    egen admin, uden om appen.

import { getSupabaseClient } from "@/lib/supabase";
import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";
import { getCustomerType } from "@/lib/customers";

// Samme PostgREST 1000-rækkers standardgrænse som cachedProducts.ts – uden
// denne side-løkke ville en kundebase på over 1000 (Jysk Plantesalgs 562, men
// voksende) blive tavst afkortet.
const PAGE_SIZE = 1000;

interface CachedCustomerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  // Kundens DERIVEREDE type ("privat"/"erhverv", se getCustomerType) – IKKE
  // den fulde, rå tags-array fra Shopify. cached_customers gemmer kun det
  // udledte resultat, da det er det eneste, appen reelt bruger tags til (se
  // lib/customers.ts). Ved læsning (mapCachedRow herunder) genskabes en
  // SYNTETISK ét-element tags-array ([customer_type]), så den eksisterende
  // getCustomerType()-logik (tags.includes("erhverv")) fortsat virker
  // uændret på tværs af hele resten af koden (søgning/filtrering/visning),
  // uanset om ShopifyCustomer stammer fra denne cache eller et direkte
  // Shopify-kald.
  customer_type: string | null;
  marketing_consent_status: string | null;
  synced_at: string | null;
}

async function fetchAllCachedRows(): Promise<CachedCustomerRow[]> {
  const supabase = getSupabaseClient();
  const rows: CachedCustomerRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cached_customers")
      .select("id, first_name, last_name, email, customer_type, marketing_consent_status, synced_at")
      .order("first_name", { ascending: true })
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

function mapCachedRow(row: CachedCustomerRow): ShopifyCustomer {
  const customerType = row.customer_type === "erhverv" ? "erhverv" : "privat";
  const marketingConsentStatus = (
    ["NOT_SUBSCRIBED", "PENDING", "SUBSCRIBED", "UNSUBSCRIBED"].includes(row.marketing_consent_status ?? "")
      ? row.marketing_consent_status
      : "NOT_SUBSCRIBED"
  ) as ShopifyCustomer["marketingConsentStatus"];

  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email,
    tags: [customerType],
    marketingConsentStatus,
  };
}

export interface CachedCustomersResult {
  customers: ShopifyCustomer[];
  syncedAt: string | null;
}

export async function getCachedCustomers(): Promise<CachedCustomersResult> {
  const rows = await fetchAllCachedRows();

  const customers = rows.map(mapCachedRow);

  // Samme "nyeste synced_at = tidspunkt for sidste FULDE synkronisering"-
  // logik som cachedProducts.ts's getCachedProducts – forskellen er, at her
  // kan rækker have FORSKELLIGE synced_at-tidspunkter (hver enkeltvis
  // upsertCachedCustomer-opdatering sætter sin egen), ikke kun én fælles fra
  // en samlet synkronisering. Den nyeste værdi er stadig meningsfuld at vise
  // som "sidst opdateret".
  const syncedAt = rows.reduce<string | null>((latest, row) => {
    if (!row.synced_at) return latest;
    if (!latest || row.synced_at > latest) return row.synced_at;
    return latest;
  }, null);

  return { customers, syncedAt };
}

// Opdaterer/indsætter ÉN kunde i cachen – kaldt UMIDDELBART efter et
// vellykket Shopify-skrivekald (customerCreate eller
// customerEmailMarketingConsentUpdate, se customerMutations.ts), ALDRIG før
// eller i stedet for selve Shopify-kaldet (Shopify er den reelle kilde til
// samtykke-status, af juridiske grunde).
export async function upsertCachedCustomer(customer: ShopifyCustomer): Promise<void> {
  const supabase = getSupabaseClient();
  const row = {
    id: customer.id,
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    customer_type: getCustomerType(customer),
    marketing_consent_status: customer.marketingConsentStatus,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("cached_customers").upsert(row, { onConflict: "id" });
  if (error) {
    throw new Error(error.message);
  }
}
