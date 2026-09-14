// Samler al datahentning for Kunder-siden ét sted – resten af Kunder-siden og
// dens komponenter kender ikke til, at data reelt hentes fra Supabases
// cached_customers-tabel (se cachedCustomers.ts), ikke et direkte
// Shopify-kald ved hver sideindlæsning. Cachen holdes ajour af
// customers/create og customers/unsubscribe (øjeblikkeligt, pr. kunde) samt
// den separate "Synkroniser kunder"-knap (fuld genopbygning, se
// customers/sync/route.ts).

import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";
import type { CustomerType } from "@/lib/format";

export type { ShopifyCustomer };

export interface CachedCustomersResponse {
  customers: ShopifyCustomer[];
  syncedAt: string | null;
}

export async function getCustomers(): Promise<CachedCustomersResponse> {
  const response = await fetch("/api/customers/cached");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Kunne ikke hente kunder.");
  }
  return { customers: data.customers, syncedAt: data.syncedAt };
}

export function getCustomerType(customer: ShopifyCustomer): CustomerType {
  return customer.tags.includes("erhverv") ? "erhverv" : "privat";
}

export function isActiveCustomer(customer: ShopifyCustomer): boolean {
  return customer.marketingConsentStatus === "SUBSCRIBED";
}
