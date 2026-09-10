// src/app/kunder/page.tsx
//
// Server Component – henter kundelisten direkte fra Shopify (samme
// fetchShopifyCustomers(), ingen ekstra klientside fetch()-tur-retur for
// den almindelige, succesfulde sti) og sender den ned som initial props til
// KunderClient, som beholder AL eksisterende interaktivitet uændret.

import { fetchShopifyCustomers } from "@/lib/shopify/fetchCustomers";
import { KunderClient } from "./KunderClient";
import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";

export default async function KunderPage() {
  let initialCustomers: ShopifyCustomer[] = [];
  let initialError: string | null = null;

  try {
    initialCustomers = await fetchShopifyCustomers();
  } catch (err) {
    console.error("Kunne ikke hente kunder fra Shopify:", err);
    initialError = err instanceof Error ? err.message : "Kunne ikke hente kunder fra Shopify.";
  }

  return <KunderClient initialCustomers={initialCustomers} initialError={initialError} />;
}
