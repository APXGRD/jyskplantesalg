// src/lib/brandSettings.ts
//
// Serverside adgang til den ENE indstillings-række i Supabases
// settings-tabel – company_name/brand_colors/brand_tone/primary_font.
// Bruges af src/app/api/settings/route.ts og alle andre serverside-steder,
// der tidligere læste direkte fra src/config/brand.ts (fx generate-
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
}

const FALLBACK_SETTINGS: BrandSettingsRow = {
  id: 0,
  company_name: brand.name,
  brand_colors: brand.colors,
  brand_tone: brand.tone,
  primary_font: brand.primaryFont,
  logo_data: null,
};

export async function getBrandSettings(): Promise<BrandSettingsRow> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("settings")
      .select("id, company_name, brand_colors, brand_tone, primary_font, logo_data")
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Ingen indstillinger fundet i settings-tabellen");
    }

    // Forsvar mod et uventet tomt/for kort array (fx en tabel, der endnu
    // ikke er migreret) – Edit-mode's swatches og "farve[0]/farve[1]"-brug i
    // app'ens egen branding kræver mindst 2 farver at virke korrekt.
    if (!Array.isArray(data.brand_colors) || data.brand_colors.length < 2) {
      return { ...data, brand_colors: brand.colors };
    }

    return data;
  } catch (err) {
    console.error("Kunne ikke hente brand-indstillinger fra Supabase (falder tilbage til brand.ts):", err);
    return FALLBACK_SETTINGS;
  }
}
