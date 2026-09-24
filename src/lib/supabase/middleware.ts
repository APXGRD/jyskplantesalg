// src/lib/supabase/middleware.ts
//
// updateSession() kaldes af src/middleware.ts på ALLE ruter (undtagen
// login-siden og invitations-flowets to offentlige sider, se
// isPublicAuthRoute herunder, samt API-routes, se isApiRoute herunder) -
// opdaterer/forny'r session-cookien og omdirigerer sider til /login, hvis
// ingen gyldig bruger findes. Følger Supabase's egen anbefalede
// @supabase/ssr-opsætning for Next.js middleware - IKKE en håndrullet
// løsning.
//
// Bruger getUser() (ikke getSession()), som gen-validerer sessionen mod
// Supabases egen server - se kommentaren i src/lib/supabase/server.ts.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login-siden selv, samt de to sider, der er en del af invitations-
  // FLOWET (afsendt via /inviter/actions.ts's inviteUserByEmail) – en
  // person, der klikker invitations-linket i mailen, har PR. DEFINITION
  // ingen session endnu, så disse to må ikke selv kræve login, ellers
  // omdirigerer middleware'et dem til /login, før de når at sætte deres
  // adgangskode. /inviter (selve "Inviter bruger"-siden, der AFSENDER en
  // invitation) er bevidst IKKE på denne liste – den skal forblive
  // beskyttet som enhver anden side.
  const isPublicAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth/confirm") ||
    request.nextUrl.pathname.startsWith("/invite/set-password");
  // API-routes omdirigeres bevidst IKKE her – en omdirigering (307 til en
  // HTML-side) er et meningsløst svar for et API-kald, og ville desuden
  // maskere, at hver enkelt route ALLIGEVEL skal have sin egen selvstændige
  // getUser()-tjek (se requireUser() i src/lib/supabase/requireUser.ts,
  // brugt i toppen af hver route-handler) – det er DEN tjek, der skal give
  // det rene 401 JSON-svar for API-kald, ikke middleware'et. Middleware
  // fortsætter derfor blot til routen for /api/*, som selv afviser kaldet.
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!user && !isPublicAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Nulstil søgeparametrene fra den oprindelige (beskyttede) side – ellers
    // "arver" login-siden fx et ?success=... fra /inviter, som intet har med
    // login at gøre (login-siden viser kun ?error=...).
    url.search = "";
    return NextResponse.redirect(url);
  }

  // VIGTIGT: supabaseResponse-objektet skal returneres uændret (ikke et
  // nyt NextResponse), ellers går de nye/fornyede session-cookies tabt -
  // se Supabases egen dokumentation for denne advarsel.
  return supabaseResponse;
}
