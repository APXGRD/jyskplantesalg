// src/app/produkter/page.tsx
//
// Server Component – henter den cachede produktliste direkte (ingen ekstra
// klientside fetch()-tur-retur for den almindelige, succesfulde sti) og
// sender den ned som initial props til ProduktvaelgerClient, som beholder
// AL eksisterende interaktivitet (søgning/filtrering/valg/synkroniser-
// knappen, uændret) – den skal fortsat være en Client Component, da den
// bruger useNewsletter() (klientside context, localStorage-baseret).

import { getCachedProducts } from "@/lib/cachedProducts";
import { ProduktvaelgerClient } from "./ProduktvaelgerClient";

export default async function ProdukterPage() {
  let initialProducts: Awaited<ReturnType<typeof getCachedProducts>>["products"] = [];
  let initialSyncedAt: string | null = null;
  let initialError: string | null = null;

  try {
    const result = await getCachedProducts();
    initialProducts = result.products;
    initialSyncedAt = result.syncedAt;
  } catch (err) {
    console.error("Kunne ikke hente cachede produkter fra Supabase:", err);
    initialError = err instanceof Error ? err.message : "Kunne ikke hente produkter.";
  }

  return (
    <ProduktvaelgerClient
      initialProducts={initialProducts}
      initialSyncedAt={initialSyncedAt}
      initialError={initialError}
    />
  );
}
