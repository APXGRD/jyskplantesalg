// src/app/api/templates/route.ts
//
// GET: henter alle gemte skabeloners id/navn/beskrivelse (IKKE selve
// block_structure – den er kun nødvendig, når én bestemt skabelon rent
// faktisk skal bruges, se generate-newsletter/route.ts), til
// "Skabelon"-dropdownen på Opsætnings-siden.
//
// POST: modtager en skabelon (navn, evt. beskrivelse, og block_structure –
// allerede renset for AI-tekst/produktvalg af buildTemplateBlockStructure på
// klienten) fra "Gem som skabelon"-dialogen og indsætter den i Supabases
// templates-tabel.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getTemplateSummaries } from "@/lib/templates";

interface SaveTemplateBody {
  name?: string;
  description?: string;
  block_structure?: unknown;
}

export async function GET() {
  try {
    const data = await getTemplateSummaries();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Kunne ikke hente skabeloner fra Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente skabeloner. Prøv igen." },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: SaveTemplateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const { name, description, block_structure: blockStructure } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Skabelonen skal have et navn" }, { status: 400 });
  }

  if (!Array.isArray(blockStructure)) {
    return NextResponse.json({ error: "block_structure mangler eller er ugyldig" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("templates").insert({
      name: name.trim(),
      description: description?.trim() || null,
      block_structure: blockStructure,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kunne ikke gemme skabelonen i Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke gemme skabelonen. Prøv igen." },
      { status: 502 },
    );
  }
}
