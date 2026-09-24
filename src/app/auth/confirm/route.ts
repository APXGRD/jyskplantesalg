// src/app/auth/confirm/route.ts
//
// Modtager KUN invitations-/magic-link-/recovery-links fra Supabases
// e-mails, hvis selve Supabase-projektets e-mail-skabelon peger direkte
// herpå (nyere skabelon-stil med {{ .TokenHash }}/{{ .Type }}) – se
// kommentaren i src/app/invite/set-password/page.tsx for den anden
// mulige leveringsvej (det ældre hash-fragment-mønster, som IKKE rammer
// denne route overhovedet).
//
// Kalder BEVIDST ikke selv verifyOtp() længere – sender i stedet blot
// token_hash+type videre som query-parametre til selve
// set-password-siden, som er den ENESTE plads, der må udføre selve
// verificeringen (se dens fil-header for hvorfor: den skal ALTID logge
// enhver eksisterende session ud FØRST, og ville denne route etablere en
// session her, ville sign-out-trinet på set-password-siden bagefter bare
// destruere den igen).

import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/invite/set-password";

  if (!token_hash || !type) {
    redirect(`/login?error=${encodeURIComponent("Invitationslinket er ugyldigt eller udløbet")}`);
  }

  const forwardUrl = new URL(next, request.url);
  forwardUrl.searchParams.set("token_hash", token_hash);
  forwardUrl.searchParams.set("type", type);
  redirect(`${forwardUrl.pathname}${forwardUrl.search}`);
}
