// src/lib/supabase/server.ts
//
// Server-side Supabase-klient til login-systemet (Server Components, Route
// Handlers, Server Actions) - læser/skriver session-cookies via next/
// headers' cookies(). Følger Supabase's egen anbefalede @supabase/ssr-
// opsætning for Next.js App Router - IKKE en håndrullet løsning. Bruger
// den offentlige anon-nøgle; denne klient er IKKE det samme som
// getSupabaseClient() i src/lib/supabase.ts, som bruger SERVICE_ROLE_KEY
// og udelukkende bruges til app'ens egen Supabase-data (settings/templates/
// cached_products/cached_customers), ikke auth.
//
// getUser() (ikke getSession()) er den eneste sikre måde at bekræfte en
// bruger på server-siden - den gen-validerer sessionen mod Supabases egen
// server hver gang, i stedet for blot at læse den lokale (og dermed
// potentielt manipulerbare) cookie-session.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Kaldes fra en Server Component (ikke en Server Action/Route
            // Handler) - kan ikke sætte cookies der. Ignoreres bevidst;
            // middleware.ts opdaterer sessionen i stedet, se
            // src/lib/supabase/middleware.ts.
          }
        },
      },
    },
  );
}
