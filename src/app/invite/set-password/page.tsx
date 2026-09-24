"use client";
// src/app/invite/set-password/page.tsx
//
// Siden, der håndterer selve invitations-linket fra mailen – lader
// personen sætte sin egen adgangskode og fuldføre oprettelsen. Bevidst
// undtaget fra middleware'ens login-krav (se
// src/lib/supabase/middleware.ts) – en nyligt inviteret person har per
// definition ingen session endnu, når siden først indlæses.
//
// RETTET FEJL: siden brugte tidligere en PASSIV getUser()/
// onAuthStateChange-baseret tjek ("er der overhovedet EN session lige nu")
// som grundlag for at vise formularen. Var en anden bruger (A) allerede
// logget ind i samme browser, fandt getUser() bare A's eksisterende
// session med det samme – formularen kaldte derefter updateUser() mod
// DEN session, og ændrede A's adgangskode i stedet for at oprette B's.
//
// Denne side parser nu i stedet selv EKSPLICIT invitationens token direkte
// fra URL'en – to mulige leveringsformer, afhængig af Supabase-projektets
// e-mail-skabelon-stil:
//   1. token_hash + type som query-parametre (enten direkte her, eller
//      videresendt fra src/app/auth/confirm/route.ts, som IKKE selv
//      forbruger token'et længere, se dens fil-header) -> verifyOtp().
//   2. access_token + refresh_token i URL'ens hash-fragment (Supabases
//      egen hostede verificerings-endpoint leverer sessionen sådan for
//      den ældre, standard e-mail-skabelon-stil) -> setSession().
// I BEGGE tilfælde logges enhver eksisterende session i browseren ALTID
// ud FØRST (uafhængigt af om der findes en), inden token'et forsøges
// udvekslet – det er DEN eksplicitte handling, der forhindrer en anden
// brugers session i ved et uheld at blive den, updateUser() rammer.
//
// Bruger bevidst sin EGEN klient-instans (ikke den delte createClient() fra
// @/lib/supabase/client.ts) med detectSessionInUrl: false – vi håndterer
// selv præcis hvilket token der bruges, og vil ikke have SDK'ens egen
// automatiske baggrundsbehandling af URL'en i vejen for det (den ville bl.a.
// kunne nå at fjerne hash-fragmentet fra URL'en, før vi selv når at læse det).

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Logo } from "@/components/Logo";
import { brand } from "@/config/brand";

type Status = "verifying" | "ready" | "invalid" | "done";

const MIN_PASSWORD_LENGTH = 8;

export default function SetPasswordPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabaseRef = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { detectSessionInUrl: false },
    }),
  );
  // React's Strict Mode (kun i dev) kører useEffect'en herunder TO GANGE
  // ved mount for at afsløre manglende oprydning – uden denne vagt ville
  // signOut()+verifyOtp() blive kaldt to gange PARALLELT mod samme
  // klient-instans, som kunne løbe om kap og ende med at rydde/overskrive
  // hinandens session, så updateUser() bagefter fejler med "Auth session
  // missing!" (set og bekræftet under fejlsøgning). Sørger for at selve
  // token-udvekslingen kun reelt sker ÉN gang pr. sidevisning.
  const hasStartedVerification = useRef(false);

  useEffect(() => {
    if (hasStartedVerification.current) return;
    hasStartedVerification.current = true;

    // BEMÆRK: intet "cancelled"-flag her – Strict Mode's SYNTETISKE
    // cleanup (kaldt lige efter selve mount, ikke ved en reel afmontering)
    // ville ellers nå at sætte det, FØR verifyOtp() overhovedet er
    // færdig, og stille og roligt undertrykke setStatus() herunder, selvom
    // token-verificeringen rent faktisk lykkedes (set og bekræftet under
    // fejlsøgning – formularen viste sig aldrig, på trods af et vellykket
    // /auth/v1/verify-kald). hasStartedVerification-vagten ovenfor sikrer
    // allerede, at selve arbejdet kun sker én gang.
    (async () => {
      const supabase = supabaseRef.current;

      // ALTID log enhver eksisterende session ud FØRST – uafhængigt af om
      // der overhovedet findes en. Se fil-headeren ovenfor for hvorfor
      // dette er den kritiske rettelse.
      await supabase.auth.signOut();

      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);
      const searchParams = new URLSearchParams(window.location.search);

      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type") as EmailOtpType | null;
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      let verified = false;

      if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
        verified = !error;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        verified = !error;
      }

      setStatus(verified ? "ready" : "invalid");
    })();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Adgangskoden skal være mindst ${MIN_PASSWORD_LENGTH} tegn`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Adgangskoderne er ikke ens");
      return;
    }

    setSubmitting(true);
    const { error } = await supabaseRef.current.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setStatus("done");
    // Fuldt reload (ikke router.push) – sikrer middleware/serverkomponenter
    // med det samme ser den nu gyldige session-cookie.
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
          <Logo className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center leading-tight">
          <h1 className="text-2xl font-semibold tracking-wide text-ink uppercase">{brand.name}</h1>
          <p className="text-sm text-ink-muted">Sæt din adgangskode</p>
        </div>
      </div>

      {status === "verifying" && (
        <p className="text-sm text-ink-muted">Bekræfter invitationslinket...</p>
      )}

      {status === "invalid" && (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-ink">Invitationslinket er ugyldigt eller udløbet.</p>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Gå til login
          </a>
        </div>
      )}

      {(status === "ready" || status === "done") && (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-ink-muted">
              Ny adgangskode
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-medium text-ink-muted">
              Gentag adgangskode
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <button
            type="submit"
            disabled={submitting || status === "done"}
            className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "done" ? "Fuldført – viderestiller..." : submitting ? "Gemmer..." : "Sæt adgangskode"}
          </button>
        </form>
      )}
    </div>
  );
}
