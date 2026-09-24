// src/lib/supabase/requireUser.ts
//
// Delt hjælpefunktion, kaldet FØRST i HVER ENKELT API-route (se
// src/app/api/**/route.ts) – gør uafhængigt af middleware.ts et helt eget
// getUser()-kald (ikke getSession(), som kun læser den lokale, potentielt
// manipulerbare cookie-session) mod Supabase for netop DENNE forespørgsel.
// Dette er bevidst IKKE en cache/memoization hen over routes – hver route
// forbliver sin egen uafhængige sikkerhedstjek, denne funktion undgår blot
// at gentage selve klient-oprettelses-boilerplaten 17 gange.
//
// Bruges sådan i toppen af en route-handler:
//   const { user, response } = await requireUser();
//   if (!user) return response;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Ikke logget ind" }, { status: 401 }),
    };
  }

  return { user, response: null };
}
