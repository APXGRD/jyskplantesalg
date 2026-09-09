"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { brand } from "@/config/brand";

// Samme FORM som src/config/brand.ts, så forbrugere kunne skifte fra
// `import { brand } from "@/config/brand"` til `const brand =
// useBrandSettings();` med minimal kodeændring.
//
// VIGTIGT: denne context er UDELUKKENDE for selve NYHEDSBREVETS indhold og
// styling (Edit-mode's farve-swatches, NewsletterCard, den kopierede HTML/
// tekst) – IKKE app'ens eget UI-chrome (Logo i sidemenuen, Sidebar-badge,
// landingssidens "Kom i gang"-knap osv.). De bruger bevidst den statiske
// brand.ts direkte i stedet, så en kundes egne brand-indstillinger aldrig
// utilsigtet omfarver selve admin-værktøjet. Se Logo.tsx (tager firmanavnet
// som prop i stedet for at hente det selv) og NewsletterCard.tsx (den ENESTE
// bruger, der giver Logo et dynamisk navn).
//
// logoPath er IKKE en kolonne i Supabases settings-tabel (kun company_name/
// brand_colors/brand_tone/primary_font er redigerbare via Indstillinger-
// siden) – den forbliver derfor altid den statiske værdi fra brand.ts.
//
// colors er en FLEKSIBEL liste (2-5 farver, fra brand_colors-kolonnen) –
// bruges direkte af Edit-mode's farve-swatches (ColorSwatches.tsx) og af
// NewsletterCard/newsletterExport til selve nyhedsbrevets styling.
export interface BrandSettings {
  name: string;
  colors: string[];
  logoPath: string;
  tone: string;
  // FONT_FAMILIES' label (fx "Georgia"), ikke selve CSS-font-family-værdien
  // – se @/lib/fontFamilies.
  primaryFont: string;
}

const STATIC_FALLBACK: BrandSettings = brand;

const BrandSettingsContext = createContext<BrandSettings>(STATIC_FALLBACK);

export function BrandSettingsProvider({ children }: { children: ReactNode }) {
  // Initial state = den statiske brand.ts-værdi (samme værdi server- og
  // klientsiden ville rendere første gang), så der ikke opstår et
  // hydration-mismatch, selvom denne provider (til forskel fra
  // NewsletterProvider) IKKE behøver ssr:false – den læser jo ikke
  // localStorage synkront, kun et helt almindeligt state-initial.
  const [settings, setSettings] = useState<BrandSettings>(STATIC_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (!cancelled && response.ok) {
          // Forsvar mod et uventet tomt/for kort array – resten af appen
          // (Edit-mode's swatches, colors[0]/[1] i app'ens egen branding)
          // regner med mindst 2 farver.
          const colors: string[] =
            Array.isArray(data.brand_colors) && data.brand_colors.length >= 2 ? data.brand_colors : brand.colors;
          setSettings({
            name: data.company_name,
            colors,
            logoPath: brand.logoPath,
            tone: data.brand_tone,
            primaryFont: data.primary_font,
          });
        }
      } catch {
        // Ignoreres bevidst – state forbliver den statiske brand.ts-værdi,
        // sat som initial state ovenfor.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // BEMÆRK: her sad tidligere en effekt, der holdt CSS-variablerne
  // --primary/--secondary i sync med Supabase, så Tailwinds bg-primary/
  // text-primary fulgte kundens indstillinger LIVE. Den er bevidst fjernet
  // igen – --primary/--secondary (globals.css/layout.tsx) er app'ens EGET,
  // faste tema og skal IKKE længere styres af kundens brand-indstillinger;
  // se kommentaren øverst i filen.

  return <BrandSettingsContext.Provider value={settings}>{children}</BrandSettingsContext.Provider>;
}

export function useBrandSettings(): BrandSettings {
  return useContext(BrandSettingsContext);
}
