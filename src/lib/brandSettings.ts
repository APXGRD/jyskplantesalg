// src/lib/brandSettings.ts
//
// Serverside adgang til den ENE indstillings-række i Supabases
// settings-tabel – company_name/brand_colors/brand_tone/primary_font samt
// de fire firmaoplysnings-felter til nyhedsbrevets footer (street_address/
// postal_code/city/business_registration_number). Bruges af
// src/app/api/settings/route.ts og alle andre serverside-steder, der
// tidligere læste direkte fra src/config/brand.ts (fx generate-
// newsletter/route.ts og OAuth-callback-siden). Fejler Supabase-kaldet
// (tabellen tom, netværksfejl osv.), falder funktionen roligt tilbage til
// brand.ts's statiske standardværdier i stedet for at vælte kalderen – det
// er netop derfor brand.ts stadig eksisterer, som fallback.
//
// De gamle primary_color/secondary_color-kolonner findes stadig i
// databasen, men læses bevidst ikke længere her – brand_colors (2-5 farver)
// har erstattet dem.

import { getSupabaseClient } from "@/lib/supabase";
import { brand } from "@/config/brand";

export interface BrandSettingsRow {
  id: number;
  company_name: string;
  brand_colors: string[];
  brand_tone: string;
  primary_font: string;
  // Base64 data-URI af et uploadet logo (Indstillinger-siden), eller null,
  // hvis intet er uploadet endnu – der er intet statisk "fallback-billede"
  // for denne, kun en kode-side fallback til det eksisterende leaf-logo (se
  // NewsletterCard.tsx/newsletterExport.ts).
  logo_data: string | null;
  // Firmaoplysninger til nyhedsbrevets footer – null betyder "ikke udfyldt
  // endnu" (kolonnerne har ingen NOT NULL-krav), håndteres pænt af
  // formatFooterAddressLine (BrandSettingsContext.tsx), som udelader et
  // tomt/manglende felt helt i stedet for at vise et hul i footer-linjen.
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  business_registration_number: string | null;
}

const FALLBACK_SETTINGS: BrandSettingsRow = {
  id: 0,
  company_name: brand.name,
  brand_colors: brand.colors,
  brand_tone: brand.tone,
  primary_font: brand.primaryFont,
  logo_data: null,
  street_address: null,
  postal_code: null,
  city: null,
  business_registration_number: null,
};

export async function getBrandSettings(): Promise<BrandSettingsRow> {
  return (await getBrandSettingsWithStatus()).settings;
}

// Hvor værdierne kommer fra: "configured" = gemt i settings-tabellen,
// "empty" = intet gemt endnu (brand.ts's standardværdier), "error" = Supabase
// kunne ikke svare (også brand.ts's standardværdier).
export type BrandSettingsStatus = "configured" | "empty" | "error";

// Som getBrandSettings, men fortæller også, HVOR værdierne kommer fra (se
// BrandSettingsStatus). Indstillinger-siden bruger det til at starte med
// TOMME felter (kun eksempel-placeholders), når intet er gemt – i stedet for
// at vise de hardcodede standardværdier, som om de var kundens egne – og til
// at vise en fejl (i stedet for en tom formular, der kunne overskrive de
// rigtige indstillinger), når Supabase ikke kunne svare.
export async function getBrandSettingsWithStatus(): Promise<{
  settings: BrandSettingsRow;
  status: BrandSettingsStatus;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("settings")
      .select(
        "id, company_name, brand_colors, brand_tone, primary_font, logo_data, street_address, postal_code, city, business_registration_number",
      )
      .limit(1)
      // .maybeSingle() (i stedet for .single()) giver data === null uden fejl
      // ved 0 rækker – .single() kastede ellers "Cannot coerce the result to
      // a single JSON object", som Next's dev-overlay viser som en fejl.
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    // Ingen række endnu (ny database, eller rækken er slettet): ikke en fejl
    // – brand.ts's standardværdier bruges, indtil nogen trykker "Gem" på
    // Indstillinger-siden, som opretter rækken igen (se api/settings/route.ts).
    if (!data) {
      return { settings: FALLBACK_SETTINGS, status: "empty" };
    }

    // Forsvar mod et uventet tomt/for kort array (fx en tabel, der endnu
    // ikke er migreret) – Edit-mode's swatches og "farve[0]/farve[1]"-brug i
    // app'ens egen branding kræver mindst 2 farver at virke korrekt.
    if (!Array.isArray(data.brand_colors) || data.brand_colors.length < 2) {
      return { settings: { ...data, brand_colors: brand.colors }, status: "configured" };
    }

    return { settings: data, status: "configured" };
  } catch (err) {
    console.error("Kunne ikke hente brand-indstillinger fra Supabase (falder tilbage til brand.ts):", err);
    return { settings: FALLBACK_SETTINGS, status: "error" };
  }
}
