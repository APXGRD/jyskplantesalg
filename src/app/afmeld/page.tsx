// src/app/afmeld/page.tsx
//
// Den OFFENTLIGE, generiske afmeldingsside – FAST link i footeren på ALLE
// nyhedsbreve (samme URL uanset modtager, se getUnsubscribeUrl), da
// "Kopiér nyhedsbrev"-arbejdsgangen ikke sender individuelle emails med et
// personligt afmeldings-token pr. modtager. Brugeren indtaster derfor selv
// sin email – ingen forudfyldt data. Bevidst UNDTAGET fra middleware'ens
// login-krav (se isPublicAuthRoute i src/lib/supabase/middleware.ts) og
// kalder en TILSVARENDE offentlig, login-fri API-route
// (api/customers/unsubscribe-by-email), da en rigtig nyhedsbrevsmodtager
// aldrig er logget ind i selve appen.
//
// Server Component, så firmanavn/logo hentes direkte fra settings-tabellen –
// den beskyttede /api/settings kan ikke bruges her uden login.

import { getBrandSettings } from "@/lib/brandSettings";
import { AfmeldForm } from "./AfmeldForm";
import { initials } from "@/lib/initials";

export default async function AfmeldPage() {
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
            Nyhedsbrev <span className="text-black/30">/</span> Afmelding
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase">Afmeld</h1>
          <p className="mt-1.5 text-sm text-[#555555]">
            Indtast din email for at afmelde dig nyhedsbrevet.
          </p>

          <AfmeldForm />
        </div>
      </div>
    </div>
  );
}
