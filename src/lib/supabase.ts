// src/lib/supabase.ts
//
// Serverside Supabase-klient – bruger service role-nøglen, som har fuld
// adgang forbi Row Level Security. Må derfor KUN importeres i serverside-kode
// (API-routes o.lign.), aldrig i en "use client"-komponent, hvor den ville
// eksponere nøglen til browseren.
//
// Klienten oprettes først, når den rent faktisk bruges (i stedet for ved
// modul-indlæsning), og kaster en tydelig fejl ved manglende miljøvariabler –
// samme mønster som fetchShopifyProducts()/fetchShopifyCustomers() – så
// kalderen (en API-route) selv kan fange fejlen og returnere en pæn
// JSON-fejlbesked i stedet for at hele routen crasher ved import.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local");
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return cachedClient;
}
