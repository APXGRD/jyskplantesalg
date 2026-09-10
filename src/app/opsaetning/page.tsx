// src/app/opsaetning/page.tsx
//
// Server Component – henter listen af gemte skabeloner direkte (ingen
// ekstra klientside fetch()-tur-retur) og sender den ned som initial props
// til OpsaetningClient. Fejler hentningen (fx Supabase midlertidigt
// utilgængelig), degraderes der roligt til en tom liste (kun "Standard
// layout" i dropdownen) i stedet for at blokere resten af siden – samme
// adfærd som den tidligere klientside useEffect havde.

import { getTemplateSummaries, type TemplateSummary } from "@/lib/templates";
import { OpsaetningClient } from "./OpsaetningClient";

export default async function OpsaetningPage() {
  let initialTemplates: TemplateSummary[] = [];

  try {
    initialTemplates = await getTemplateSummaries();
  } catch (err) {
    console.error("Kunne ikke hente skabeloner fra Supabase:", err);
  }

  return <OpsaetningClient initialTemplates={initialTemplates} />;
}
