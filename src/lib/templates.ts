// src/lib/templates.ts
//
// Serverside adgang til listen af gemte skabeloners id/navn/beskrivelse
// (IKKE selve block_structure – den er kun nødvendig, når én bestemt
// skabelon rent faktisk skal bruges, se generate-newsletter/route.ts).
// Bruges direkte af src/app/opsaetning/page.tsx (Server Component, ingen
// ekstra HTTP-tur-retur) OG af src/app/api/templates/route.ts (samme
// funktion, kaldt via HTTP – SaveTemplateDialog.tsx kalder POST på samme
// route, ikke omfattet her).

import { getSupabaseClient } from "@/lib/supabase";

export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
}

export async function getTemplateSummaries(): Promise<TemplateSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, description")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
