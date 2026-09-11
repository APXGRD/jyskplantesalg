// src/app/api/templates/[id]/route.ts
//
// DELETE: sletter én gemt skabelon fra Supabases templates-tabel ud fra id –
// kaldt fra "Skabelon"-sektionens sletteknap på Opsætnings-siden (se
// OpsaetningClient.tsx). Selve GET/POST for HELE skabelon-listen ligger
// fortsat i den overordnede src/app/api/templates/route.ts, uændret.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/templates/[id]">) {
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "Mangler skabelon-id" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("templates").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kunne ikke slette skabelonen i Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke slette skabelonen. Prøv igen." },
      { status: 502 },
    );
  }
}
