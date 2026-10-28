// src/app/opsaetning/page.tsx
//
// Server Component – henter listen af gemte skabeloner OG listen af unikke
// planteformer (custom.planteform-metafeltet) direkte (ingen ekstra
// klientside fetch()-tur-retur) og sender begge ned som initial props til
// OpsaetningClient. Fejler en af hentningerne (fx Supabase midlertidigt
// utilgængelig), degraderes der roligt til en tom liste (kun "Standard
// layout" hhv. "Alle planteformer" i de to dropdowns) i stedet for at
// blokere resten af siden – samme adfærd som den tidligere klientside
// useEffect havde.

import { getTemplateSummaries, type TemplateSummary } from "@/lib/templates";
import { getCachedProducts } from "@/lib/cachedProducts";
import { extractPlantForms } from "@/lib/productSync";
import { OpsaetningClient } from "./OpsaetningClient";

export default async function OpsaetningPage() {
  let initialTemplates: TemplateSummary[] = [];
  let initialPlantForms: string[] = [];
  // Tidspunktet for sidste produkt-synkronisering fra Shopify – Opsætning
  // viser det og synkroniserer automatisk, hvis det er over et døgn gammelt.
  let initialProductsSyncedAt: string | null = null;

  try {
    initialTemplates = await getTemplateSummaries();
  } catch (err) {
    console.error("Kunne ikke hente skabeloner fra Supabase:", err);
  }

  try {
    const { products, syncedAt } = await getCachedProducts();
    initialPlantForms = extractPlantForms(products);
    initialProductsSyncedAt = syncedAt;
  } catch (err) {
    console.error("Kunne ikke hente planteformer fra Supabase:", err);
  }

  return (
    <OpsaetningClient
      initialTemplates={initialTemplates}
      initialPlantForms={initialPlantForms}
      initialProductsSyncedAt={initialProductsSyncedAt}
    />
  );
}
