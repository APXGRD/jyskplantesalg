// src/lib/supabase/client.ts
//
// Browser-side Supabase-klient til login-systemet (bruges af klient-
// komponenter, fx login-formularen). Følger Supabase's egen anbefalede
// @supabase/ssr-opsætning for Next.js App Router - IKKE en håndrullet
// løsning. Bruger den offentlige anon-nøgle (aldrig SERVICE_ROLE_KEY, som
// forbliver server-only, se src/lib/supabase.ts).

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
