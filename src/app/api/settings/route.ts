// src/app/api/settings/route.ts
//
// GET: henter den ene brand-indstillings-række (company_name/brand_colors/
// brand_tone/primary_font/logo_data) fra Supabase – bruges af
// BrandSettingsContext ved sideindlæsning, og af Indstillinger-sidens
// formular.
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
  logo_data?: string | null;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MIN_BRAND_COLORS = 2;
const MAX_BRAND_COLORS = 5;

// Klienten håndhæver allerede 500 KB på den ORIGINALE fil (se Indstillinger-
// siden) – dette er kun et defensivt loft på selve base64-strengen server-
// side, for en klient, der springer den tjek over. Base64 er ~4/3 af
// originalstørrelsen, plus et lille "data:image/...;base64,"-prefiks –
// 700.000 tegn giver rigelig plads til en gyldig 500 KB-fil uden at tillade
// noget urimeligt større.
const MAX_LOGO_DATA_LENGTH = 700_000;
const LOGO_DATA_URI_PATTERN = /^data:image\/(png|jpe?g);base64,/;

export async function PUT(req: NextRequest) {
  let body: UpdateSettingsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const { company_name, brand_colors, brand_tone, primary_font, logo_data } = body;

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
  if (logo_data !== null && logo_data !== undefined) {
    if (typeof logo_data !== "string" || !LOGO_DATA_URI_PATTERN.test(logo_data)) {
      return NextResponse.json({ error: "Logo skal være en PNG- eller JPEG-billedfil" }, { status: 400 });
    }
    if (logo_data.length > MAX_LOGO_DATA_LENGTH) {
      return NextResponse.json({ error: "Logoet er for stort (maks. 500 KB)" }, { status: 400 });
    }
  }

  try {
    const supabase = getSupabaseClient();

    // .maybeSingle() (i stedet for .single()) tolererer 0 rækker uden selv
    // at kaste en fejl – kun >1 række er en reel fejltilstand her. Er
    // singleton-rækken af en eller anden grund væk (fx slettet manuelt),
    // opretter vi den bare igen i stedet for at fejle permanent, indtil
    // nogen manuelt indsætter den via SQL.
    const { data: existing, error: fetchError } = await supabase.from("settings").select("id").limit(1).maybeSingle();
    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const values = {
      company_name: company_name.trim(),
      brand_colors,
      brand_tone: brand_tone.trim(),
      primary_font,
      logo_data: logo_data ?? null,
    };

    // De gamle primary_color/secondary_color-kolonner er NOT NULL uden
    // default i databasen, men UPDATE rører dem bevidst ikke længere (se
    // filens header-kommentar) – på en eksisterende række er det fint, den
    // beholder bare sin nuværende værdi. Men findes rækken slet ikke (se
    // INSERT-grenen herunder), skal NOT NULL-kravet stadig opfyldes, så vi
    // seeder dem her ud fra de nye brand_colors, kun ved selve oprettelsen.
    const { error: writeError } = existing
      ? await supabase.from("settings").update(values).eq("id", existing.id)
      : await supabase
          .from("settings")
          .insert({ ...values, primary_color: brand_colors[0], secondary_color: brand_colors[1] ?? brand_colors[0] });

    if (writeError) {
      throw new Error(writeError.message);
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
