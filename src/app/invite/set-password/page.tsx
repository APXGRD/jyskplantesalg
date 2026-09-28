// src/app/invite/set-password/page.tsx
//
// Siden, hvor en inviteret bruger vælger sin adgangskode. Server Component,
// så firmanavn/logo hentes direkte fra settings-tabellen (siden er offentlig
// – den beskyttede /api/settings kan ikke bruges uden login). Al token-
// verificering og selve gemningen sker i SetPasswordForm (klient).

import { getBrandSettings } from "@/lib/brandSettings";
import { initials } from "@/lib/initials";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function SetPasswordPage() {
  const settings = await getBrandSettings();
  const companyName = settings.company_name.trim();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#EAEAEA] bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-size-[32px_32px] px-4 py-12 font-grotesk text-[#111111] antialiased selection:bg-black selection:text-white">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-black/15 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 border-b border-black/10 bg-white/70 px-6 py-4">
          {settings.logo_data ? (
            // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
            <img src={settings.logo_data} alt="" className="h-7 w-7 shrink-0 object-contain" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-black font-jetbrains text-xs font-bold tracking-tighter text-white">
              {companyName ? initials(companyName) : "–"}
            </div>
          )}
          <span
            className={`truncate text-lg leading-none font-bold tracking-tight uppercase ${
              companyName ? "text-[#111111]" : "text-black/30"
            }`}
          >
            {companyName || "Logo"}
          </span>
        </div>

        <div className="px-6 pt-7 pb-8 sm:px-8">
          <div className="mb-1.5 font-jetbrains text-[10px] tracking-widest text-[#71717A] uppercase">
            Invitation <span className="text-black/30">/</span> Adgang
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase">Sæt adgangskode</h1>
          <p className="mt-1.5 text-sm text-[#555555]">Vælg en adgangskode for at fuldføre din konto.</p>

          <SetPasswordForm />
        </div>
      </div>
    </div>
  );
}
