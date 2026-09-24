// src/app/login/page.tsx
//
// Login-side - email + adgangskode, via Server Action'en login() (se
// actions.ts), som kalder supabase.auth.signInWithPassword server-side.
// INGEN selvbetjent oprettelse/signup-mulighed her eller andre steder i
// appen - kun login. Denne side er selv undtaget fra middleware'ens
// login-krav (se src/lib/supabase/middleware.ts), ellers ville den
// omdirigere til sig selv i det uendelige.

import { login } from "./actions";
import { Logo } from "@/components/Logo";
import { brand } from "@/config/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
          <Logo className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center leading-tight">
          <h1 className="text-2xl font-semibold tracking-wide text-ink uppercase">{brand.name}</h1>
          <p className="text-sm text-ink-muted">Log ind for at fortsætte</p>
        </div>
      </div>

      <form
        action={login}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-ink-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-medium text-ink-muted">
            Adgangskode
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Log ind
        </button>
      </form>
    </div>
  );
}
