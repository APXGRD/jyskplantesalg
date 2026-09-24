// src/proxy.ts
//
// Beskytter HELE appen: tjekker login-status på alle ruter (sider OG API-
// routes) undtagen selve login-siden, se src/lib/supabase/middleware.ts.
// Dette er kun ÉT lag - hver API-route har DESUDEN sin egen uafhængige
// getUser()-tjek (se fx src/app/api/settings/route.ts), så en direkte
// API-forespørgsel, der springer UI'et (og dermed denne proxy) over,
// stadig afvises korrekt. matcher-mønsteret herunder er Supabases eget
// anbefalede standard-mønster.
//
// Hed "middleware.ts" indtil Next.js 16 omdøbte konventionen til
// "proxy.ts" (funktionaliteten er uændret, kun navnet) - se
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// src/lib/supabase/middleware.ts beholder bevidst sit oprindelige
// filnavn/eksportnavn (updateSession) - det er Supabases eget navngivne
// hjælpefil-mønster fra @supabase/ssr's dokumentation, ikke selve Next.js'
// fil-konvention.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
