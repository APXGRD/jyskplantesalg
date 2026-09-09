// src/app/api/settings/route.ts
//
// GET: henter den ene brand-indstillings-række (company_name/brand_colors/
// brand_tone/primary_font) fra Supabase – bruges af BrandSettingsContext ved
// sideindlæsning, og af Indstillinger-sidens formular.
//
// PUT: opdaterer samme række. Der findes bevidst kun ÉN indstillings-række
// (settings-tabellen er en singleton) – vi henter dens id først i stedet for
// at antage id=1, så det virker uanset hvordan rækken oprindeligt blev
// indsat.
//
// De gamle primary_color/secondary_color-kolonner findes stadig i
// databasen (rørt ikke, ikke slettet), men læses/skrives bevidst ikke
// længere her – brand_colors (2-5 farver) har erstattet dem.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getBrandSettings } from "@/lib/brandSettings";
import { FONT_FAMILIES } from "@/lib/fontFamilies";

export async function GET() {
  const settings = await getBrandSettings();
  return NextResponse.json(settings);
}

interface UpdateSettingsBody {
  company_name?: string;
  brand_colors?: string[];
  brand_tone?: string;
  primary_font?: string;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MIN_BRAND_COLORS = 2;
const MAX_BRAND_COLORS = 5;

export async function PUT(req: NextRequest) {
  let body: UpdateSettingsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const { company_name, brand_colors, brand_tone, primary_font } = body;

  if (typeof company_name !== "string" || company_name.trim().length === 0) {
    return NextResponse.json({ error: "Firmanavn må ikke være tomt" }, { status: 400 });
  }
  if (
    !Array.isArray(brand_colors) ||
    brand_colors.length < MIN_BRAND_COLORS ||
    brand_colors.length > MAX_BRAND_COLORS ||
    !brand_colors.every((color) => typeof color === "string" && HEX_COLOR_PATTERN.test(color))
  ) {
    return NextResponse.json(
      { error: `Brandfarver skal være en liste på ${MIN_BRAND_COLORS}-${MAX_BRAND_COLORS} gyldige hex-farver` },
      { status: 400 },
    );
  }
  if (typeof brand_tone !== "string" || brand_tone.trim().length === 0) {
    return NextResponse.json({ error: "Tone-of-voice må ikke være tom" }, { status: 400 });
  }
  if (typeof primary_font !== "string" || !FONT_FAMILIES.some((font) => font.label === primary_font)) {
    return NextResponse.json({ error: "Skrifttype skal være en af de tilgængelige web-safe fonte" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    const { data: existing, error: fetchError } = await supabase.from("settings").select("id").limit(1).single();
    if (fetchError || !existing) {
      throw new Error(fetchError?.message ?? "Ingen indstillings-række at opdatere");
    }

    const { error: updateError } = await supabase
      .from("settings")
      .update({
        company_name: company_name.trim(),
        brand_colors,
        brand_tone: brand_tone.trim(),
        primary_font,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kunne ikke opdatere indstillingerne i Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke gemme indstillingerne. Prøv igen." },
      { status: 502 },
    );
  }
}
