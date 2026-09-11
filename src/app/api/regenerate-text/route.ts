// src/app/api/regenerate-text/route.ts
//
// POST: regenererer UDELUKKENDE nyhedsbrevets heading/bodyText, ud fra et
// EKSPLICIT angivet produkt-sæt (productIds) – typisk UNIONEN af de
// produkter, der aktuelt er valgt på tværs af Produktvisnings- og Billede/
// Galleri-blokkene i Edit-mode (samme union-beregning som CTA-linket
// allerede bruger, se collectCtaRelevantProducts i EditorBlockList.tsx),
// IKKE de oprindelige seed-produkter fra selve genereringen (se
// generate-newsletter/route.ts). Genbruger PRÆCIS samme prompt-opbygning
// (buildNewsletterUserPrompt) som selve genereringen, men ignorerer AI-
// svarets image/cta-felter – kalderen opdaterer selv KUN Overskrift-/
// Brødtekst-blokkenes indhold, rører intet andet (blok-struktur, styling,
// billeder, CTA).

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCachedProducts } from "@/lib/cachedProducts";
import { getBrandSettings } from "@/lib/brandSettings";
import { buildNewsletterUserPrompt } from "@/lib/prompts/newsletterPrompt";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";

interface RegenerateTextBody {
  customerType?: CustomerType;
  // Samme "yderligere instrukser"-tekst, det oprindelige generate-newsletter-
  // kald brugte til tone/fokus (se NewsletterContext.instructions) –
  // udelukkende brugt til sprog/tone, ligesom ved den oprindelige generering.
  instructions?: string;
  // Den AKTUELLE union af produkter, vist på tværs af Produktvisnings- og
  // Billede/Galleri-blokkene i Edit-mode – IKKE de oprindelige seed-
  // produkter. Påkrævet, ellers er der intet at regenerere teksten ud fra.
  productIds?: string[];
  // Bruges KUN til samme "kategori-scenarie"-sprogregel i prompten som ved
  // den oprindelige generering (se buildNewsletterUserPrompt) – ikke
  // påkrævet.
  topicSearchTerm?: string;
}

function isCustomerType(value: unknown): value is CustomerType {
  return value === "privat" || value === "erhverv";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Mangler GEMINI_API_KEY i .env.local" }, { status: 500 });
  }

  let body: RegenerateTextBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const { customerType, instructions, productIds, topicSearchTerm } = body;

  if (!isCustomerType(customerType)) {
    return NextResponse.json({ error: "customerType skal være 'privat' eller 'erhverv'" }, { status: 400 });
  }
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ error: "Intet produkt at regenerere teksten ud fra" }, { status: 400 });
  }

  let selectedProducts;
  try {
    const { products } = await getCachedProducts();
    const idSet = new Set(productIds);
    selectedProducts = products.filter((product) => idSet.has(product.id));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke hente produktdata." },
      { status: 502 },
    );
  }
  if (selectedProducts.length === 0) {
    return NextResponse.json({ error: "De valgte produkter blev ikke fundet" }, { status: 400 });
  }

  const productsForPrompt = selectedProducts.map((product) => ({
    id: product.id,
    title: product.title,
    price: formatPriceForCustomer(product.price, customerType),
    imageUrl: product.imageUrl,
    url: product.url,
    productType: product.productType,
  }));

  const brandSettings = await getBrandSettings();
  const trimmedInstructions = typeof instructions === "string" ? instructions.trim() : "";

  const { systemPrompt, userPrompt } = buildNewsletterUserPrompt(
    {
      storeName: brandSettings.company_name,
      brandTone: brandSettings.brand_tone,
      products: productsForPrompt,
    },
    { customerType, instructions: trimmedInstructions, topicSearchTerm: topicSearchTerm || undefined },
  );

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Intet svar fra Gemini");
    }

    const parsed = JSON.parse(text);
    // KUN heading/bodyText bruges af kalderen (se fil-kommentaren) – image/
    // cta i AI-svaret ignoreres bevidst, sendes ikke engang med tilbage.
    return NextResponse.json({ heading: parsed.heading, bodyText: parsed.bodyText });
  } catch (err) {
    console.error("regenerate-text fejlede:", err);
    return NextResponse.json({ error: "Kunne ikke regenerere teksten lige nu. Prøv igen." }, { status: 502 });
  }
}
