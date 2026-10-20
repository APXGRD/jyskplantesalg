// Ramme til siderne uden login (Log ind, Sæt adgangskode) i samme Stitch-
// design som resten af appen: topbar med firmanavnet i EB Garamond og
// skovgrøn linje, en smal centreret kolonne med trin-etiket, titel og et
// hvidt kort med formularen. Ingen navigation – brugeren er ikke logget ind.

import type { ReactNode } from "react";

export const authFieldClassName =
  "h-12 w-full rounded-sm border border-hairline bg-white px-4 text-base text-[#1a1a1a] transition-colors placeholder:text-stone/60 focus:border-forest focus:outline-none";
export const authLabelClassName = "mb-1 block text-[11px] font-semibold tracking-wider text-stone uppercase";
export const authButtonClassName =
  "flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#36482e] px-8 text-xs font-semibold tracking-widest text-white uppercase shadow-sm transition-colors hover:bg-plant-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
export const authErrorClassName = "rounded-sm bg-rose-bg px-4 py-2 text-sm text-rose-ink";

export function AuthShell({
  companyName,
  logoData,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  companyName: string;
  logoData?: string | null;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-plant-bg font-sans text-ink-deep antialiased">
      <header className="w-full border-b border-forest">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-5 md:px-12">
          <span className="flex min-w-0 items-center gap-2">
            {/* Kun et UPLOADET logo vises – uden logo står firmanavnet alene (ingen
                automatisk genereret logo). */}
            {logoData && (
              // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
              <img src={logoData} alt="" className="h-7 w-7 shrink-0 object-contain" />
            )}
            <span
              className={`truncate font-garamond text-2xl leading-[1.35] font-medium tracking-tight text-forest ${
                companyName ? "" : "opacity-30"
              }`}
            >
              {companyName || "Logo"}
            </span>
          </span>
        </div>
      </header>

      <main className="flex w-full flex-1 items-start justify-center px-5 py-16 md:items-center">
        <div className="w-full max-w-[440px]">
          <header className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-forest" />
              <p className="text-xs font-semibold tracking-[0.2em] text-stone uppercase">{eyebrow}</p>
            </div>
            <h1 className="font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-[#1a1a1a] md:text-4xl md:leading-[1.25]">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-stone">{subtitle}</p>}
            <div className="mt-4 h-px w-full bg-hairline" />
          </header>

          <div className="rounded-sm border border-hairline bg-white p-6">{children}</div>
        </div>
      </main>

      <footer className="h-12 w-full border-t border-hairline" />
    </div>
  );
}
