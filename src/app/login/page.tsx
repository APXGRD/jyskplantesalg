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
import { initials } from "@/lib/initials";

// Vises, når der endnu ikke er gemt et firmanavn på Indstillinger-siden – i
// stedet for brand.ts's hardcodede standardnavn.
const APP_NAME = "Nyhedsbrev generator";

const fieldClassName =
  "w-full rounded-xs border border-[#cfcfcf] bg-[#fdfdfd] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-neutral-400 transition-colors focus:border-black focus:bg-white focus:outline-none";

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
    <div className="flex min-h-screen w-full items-center justify-center bg-[#EAEAEA] bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-size-[32px_32px] px-4 py-12 font-grotesk text-[#111111] antialiased selection:bg-black selection:text-white">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-black/15 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        {/* Brand-linje, samme opbygning som topbaren */}
        <div className="flex items-center gap-3 border-b border-black/10 bg-white/70 px-6 py-4">
          {status === "configured" && settings.logo_data ? (
            // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
            <img src={settings.logo_data} alt="" className="h-7 w-7 shrink-0 object-contain" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-black font-jetbrains text-xs font-bold tracking-tighter text-white">
              {initials(companyName)}
            </div>
          )}
          <span className="truncate text-lg leading-none font-bold tracking-tight text-[#111111] uppercase">
            {companyName}
          </span>
        </div>

        <div className="px-6 pt-7 pb-8 sm:px-8">
          <div className="mb-1.5 font-jetbrains text-[10px] tracking-widest text-[#71717A] uppercase">
            Nyhedsbrev-generator <span className="text-black/30">/</span> Adgang
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase">Log ind</h1>
          <p className="mt-1.5 text-sm text-[#555555]">Log ind for at fortsætte</p>

          <form action={login} className="mt-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="font-jetbrains text-[11px] text-[#666666] uppercase">
                Email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={fieldClassName} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="font-jetbrains text-[11px] text-[#666666] uppercase">
                Adgangskode
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={fieldClassName}
              />
            </div>

            {error && (
              <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 font-jetbrains text-xs text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-1 w-full bg-black px-7 py-3 font-jetbrains text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-[#222222] active:scale-[0.99]"
            >
              Log ind
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
