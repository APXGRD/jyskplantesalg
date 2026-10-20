// src/app/login/page.tsx
//
// Login-side - email + adgangskode, via Server Action'en login() (se
// actions.ts), som kalder supabase.auth.signInWithPassword server-side.
// INGEN selvbetjent oprettelse/signup-mulighed her eller andre steder i
// appen - kun login. Denne side er selv undtaget fra middleware'ens
// login-krav (se src/lib/supabase/middleware.ts), ellers ville den
// omdirigere til sig selv i det uendelige.

import { login } from "./actions";
import { getBrandSettingsWithStatus } from "@/lib/brandSettings";
import {
  AuthShell,
  authButtonClassName,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
} from "@/components/AuthShell";
import { ArrowRightIcon } from "@/components/icons";

// Vises, når der endnu ikke er gemt et firmanavn på Indstillinger-siden – i
// stedet for brand.ts's hardcodede standardnavn.
const APP_NAME = "Nyhedsbrev generator";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { settings, status } = await getBrandSettingsWithStatus();
  // Kun et GEMT firmanavn vises; ellers appens eget navn (se APP_NAME).
  const companyName = (status === "configured" && settings.company_name.trim()) || APP_NAME;

  return (
    <AuthShell
      companyName={companyName}
      logoData={status === "configured" ? settings.logo_data : null}
      eyebrow="Adgang / Log ind"
      title="Log ind"
      subtitle="Log ind for at fortsætte"
    >
      <form action={login} className="flex flex-col gap-4">
        <label className="block">
          <span className={authLabelClassName}>Email</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="navn@firma.dk"
            className={authFieldClassName}
          />
        </label>

        <label className="block">
          <span className={authLabelClassName}>Adgangskode</span>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={authFieldClassName}
          />
        </label>

        {error && <p className={authErrorClassName}>{error}</p>}

        <div className="mt-2 border-t border-hairline pt-6">
          <button type="submit" className={authButtonClassName}>
            Log ind
            <ArrowRightIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
