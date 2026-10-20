"use client";
// src/app/invite/set-password/SetPasswordForm.tsx
// (selve siden – brand-rammen – ligger i page.tsx)
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
import {
  authButtonClassName,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
} from "@/components/AuthShell";
import { CheckIcon, SpinnerIcon } from "@/components/icons";

type Status = "verifying" | "ready" | "invalid" | "done";

const MIN_PASSWORD_LENGTH = 8;

export function SetPasswordForm() {
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

  if (status === "verifying") {
    return (
      <p className="flex items-center gap-2 text-sm text-stone">
        <SpinnerIcon className="h-4 w-4 animate-spin" />
        Bekræfter invitationslinket...
      </p>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <p className={authErrorClassName}>Invitationslinket er ugyldigt eller udløbet.</p>
        <a
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-sm border border-forest px-8 text-xs font-semibold tracking-widest text-forest uppercase transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white"
        >
          Gå til login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className={authLabelClassName}>Ny adgangskode</span>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authFieldClassName}
        />
        <span className="mt-1 block text-xs text-stone">Mindst {MIN_PASSWORD_LENGTH} tegn.</span>
      </label>

      <label className="block">
        <span className={authLabelClassName}>Gentag adgangskode</span>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={authFieldClassName}
        />
      </label>

      {formError && <p className={authErrorClassName}>{formError}</p>}

      <div className="mt-2 border-t border-hairline pt-6">
        <button type="submit" disabled={submitting || status === "done"} className={authButtonClassName}>
          {submitting ? (
            <SpinnerIcon className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <CheckIcon className="h-[18px] w-[18px]" />
          )}
          {status === "done" ? "Fuldført – viderestiller..." : submitting ? "Gemmer..." : "Sæt adgangskode"}
        </button>
      </div>
    </form>
  );
}
