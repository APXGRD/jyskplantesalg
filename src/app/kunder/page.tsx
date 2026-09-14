// src/app/kunder/page.tsx
//
// Server Component – henter kundelisten direkte fra Supabases
// cached_customers-tabel (getCachedCustomers, ingen ekstra klientside
// fetch()-tur-retur for den almindelige, succesfulde sti) og sender den ned
// som initial props til KunderClient, som beholder AL eksisterende
// interaktivitet uændret. IKKE længere et direkte Shopify-kald ved hver
// sideindlæsning – se cachedCustomers.ts for hvordan cachen holdes ajour.

import { getCachedCustomers } from "@/lib/cachedCustomers";
import { KunderClient } from "./KunderClient";
import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";

export default async function KunderPage() {
  let initialCustomers: ShopifyCustomer[] = [];
  let initialSyncedAt: string | null = null;
  let initialError: string | null = null;

  try {
    const result = await getCachedCustomers();
    initialCustomers = result.customers;
    initialSyncedAt = result.syncedAt;
  } catch (err) {
    console.error("Kunne ikke hente cachede kunder fra Supabase:", err);
    initialError = err instanceof Error ? err.message : "Kunne ikke hente kunder.";
  }

  return (
    <KunderClient
      initialCustomers={initialCustomers}
      initialSyncedAt={initialSyncedAt}
      initialError={initialError}
    />
  );
}
