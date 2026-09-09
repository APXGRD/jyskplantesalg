"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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
// brand_colors/brand_tone/primary_font/logo_data er redigerbare via
// Indstillinger-siden) – den forbliver derfor altid den statiske værdi fra
// brand.ts.
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
  // Base64 data-URI af et uploadet logo (Indstillinger-siden), eller null,
  // hvis intet er uploadet – bruges KUN af selve nyhedsbrevet (fx
  // NewsletterCard's header), aldrig af app'ens eget Logo/Sidebar, som
  // fortsat viser det faste leaf-logo uanset denne værdi.
  logoData: string | null;
}

const STATIC_FALLBACK: BrandSettings = { ...brand, logoData: null };

// Ren, side-effekt-fri oversættelse af /api/settings's svar til
// BrandSettings-formen – delt mellem den indledende hentning ved mount og
// useRefreshBrandSettings() herunder, så de aldrig kan komme ud af trit med
// hinanden.
function mapResponseToSettings(data: {
  company_name: string;
  brand_colors: unknown;
  brand_tone: string;
  primary_font: string;
  logo_data: unknown;
}): BrandSettings {
  // Forsvar mod et uventet tomt/for kort array – resten af appen
  // (Edit-mode's swatches, colors[0]/[1] i app'ens egen branding) regner
  // med mindst 2 farver.
  const colors: string[] =
    Array.isArray(data.brand_colors) && data.brand_colors.length >= 2 ? (data.brand_colors as string[]) : brand.colors;
  return {
    name: data.company_name,
    colors,
    logoPath: brand.logoPath,
    tone: data.brand_tone,
    primaryFont: data.primary_font,
    logoData: typeof data.logo_data === "string" ? data.logo_data : null,
  };
}

const BrandSettingsContext = createContext<BrandSettings>(STATIC_FALLBACK);

// BrandSettingsProvider sidder i root-layoutet og genmonteres derfor ALDRIG
// ved almindelig klient-side navigation (kun ved et hårdt reload) – uden
// denne blev et gem på Indstillinger-siden usynligt alle andre steder i
// appen, indtil brugeren genindlæste siden, selvom selve gemningen i
// Supabase lykkedes. Se useRefreshBrandSettings() herunder, som
// Indstillinger-siden kalder umiddelbart efter et vellykket gem.
const RefreshBrandSettingsContext = createContext<() => Promise<void>>(async () => {});

export function BrandSettingsProvider({ children }: { children: ReactNode }) {
  // Initial state = den statiske brand.ts-værdi (samme værdi server- og
  // klientsiden ville rendere første gang), så der ikke opstår et
  // hydration-mismatch, selvom denne provider (til forskel fra
  // NewsletterProvider) IKKE behøver ssr:false – den læser jo ikke
  // localStorage synkront, kun et helt almindeligt state-initial.
  const [settings, setSettings] = useState<BrandSettings>(STATIC_FALLBACK);

  // Kan kaldes UDEFRA (fx Indstillinger-siden efter et vellykket gem) – til
  // forskel fra mount-effekten herunder er det её FINE, da den kaldes fra en
  // event-handler, ikke synkront inde i en effekt-krop.
  const refreshBrandSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (response.ok) {
        setSettings(mapResponseToSettings(data));
      }
    } catch {
      // Ignoreres bevidst – state forbliver den seneste kendte værdi.
    }
  }, []);

  // Inline async IIFE (i stedet for at kalde refreshBrandSettings direkte)
  // for at overholde react-hooks/set-state-in-effect – reglen tillader en
  // setState-kaldende funktion DEFINERET INDE I selve effekt-kroppen, men
  // ikke et kald til en navngivet/useCallback-indpakket funktion udefra.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (!cancelled && response.ok) {
          setSettings(mapResponseToSettings(data));
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

  return (
    <BrandSettingsContext.Provider value={settings}>
      <RefreshBrandSettingsContext.Provider value={refreshBrandSettings}>
        {children}
      </RefreshBrandSettingsContext.Provider>
    </BrandSettingsContext.Provider>
  );
}

export function useBrandSettings(): BrandSettings {
  return useContext(BrandSettingsContext);
}

// Kaldes af Indstillinger-siden umiddelbart efter et vellykket PUT, så hele
// appen (Edit-mode, NewsletterCard, den kopierede HTML osv.) med det samme
// ser de nye indstillinger – uden det ville et gem først slå igennem efter
// et hårdt reload, se kommentaren ved RefreshBrandSettingsContext ovenfor.
export function useRefreshBrandSettings(): () => Promise<void> {
  return useContext(RefreshBrandSettingsContext);
}
