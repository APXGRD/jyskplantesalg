// src/app/api/products/product-types/route.ts
//
// GET: henter alle unikke, ikke-tomme plant_form-værdier ("Planteform") fra
// cached_products, alfabetisk sorteret – bruges af Opsætnings-sidens
// "Planteform"-dropdown (se OpsaetningClient.tsx). Selve FØRSTE
// sideindlæsning læser i stedet direkte via getCachedPlantForms() i en
// Server Component (se opsaetning/page.tsx), uden denne ekstra
// HTTP-tur-retur – denne route er til evt. klientside genindlæsning, samme
// mønster som /api/products/cached.
//
// Hed tidligere også product_type-baserede "Plantesort"-værdier, men det
// filter er fjernet igen fra Opsætnings-siden – routen beholder sit
// oprindelige navn (product-types) for ikke at ændre URL'en, men returnerer
// nu udelukkende plantForms.

import { NextResponse } from "next/server";
import { getCachedPlantForms } from "@/lib/cachedProducts";

export async function GET() {
  try {
    const plantForms = await getCachedPlantForms();
    return NextResponse.json({ plantForms });
  } catch (err) {
    console.error("Kunne ikke hente planteformer fra Supabase:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente planteformer." },
      { status: 502 },
    );
  }
}
