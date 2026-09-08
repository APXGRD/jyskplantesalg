// src/app/api/generate-newsletter/route.ts
//
// Modtager de valgte produkt-id'er + målgruppe + evt. instrukser fra Opsætnings-siden,
// slår produkterne op i mockShopData, bygger AI-prompten og beder Gemini om at generere
// nyhedsbrevets fire felter (heading/bodyText/image/cta) som struktureret JSON.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { collectionUrls, mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { buildNewsletterUserPrompt } from "@/lib/prompts/newsletterPrompt";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";

interface GenerateNewsletterBody {
  productIds?: string[];
  customerType?: CustomerType;
  instructions?: string;
}

function isCustomerType(value: unknown): value is CustomerType {
  return value === "privat" || value === "erhverv";
}

// CTA-linket bestemmes deterministisk i kode ud fra de faktisk valgte
// produkter – ikke af AI'en – så det altid er forudsigeligt og korrekt:
// - Er ALLE valgte produkter af samme productType (fx "vælg hele
//   Multistammet-kategorien"), peger CTA'en på selve kategori-siden
//   (collectionUrls) i stedet for ét enkelt produkt deri.
// - Ellers (blandet/håndplukket valg, eller en kategori uden en kendt
//   collection-URL endnu) peges der på det primære/første valgte produkts
//   egen url, som hidtil.
function resolveCtaUrl(selectedProducts: ShopifyProduct[]): string {
  const primaryUrl = selectedProducts[0].url;
  // .every() er trivielt sandt for et enkelt element, så "kategori-scenarie"
  // kræver EKSPLICIT også mere end ét valgt produkt – ellers ville et enkelt
  // valgt produkt fejlagtigt pege på hele kategori-siden i stedet for sin
  // egen produktside.
  const isCategoryScenario =
    selectedProducts.length > 1 &&
    selectedProducts.every((product) => product.productType === selectedProducts[0].productType);
  if (isCategoryScenario) {
    return collectionUrls[selectedProducts[0].productType] ?? primaryUrl;
  }
  return primaryUrl;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Mangler GEMINI_API_KEY i .env.local" },
      { status: 500 },
    );
  }

  let body: GenerateNewsletterBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const { productIds, customerType, instructions } = body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json(
      { error: "Mindst ét produkt skal vælges (productIds)" },
      { status: 400 },
    );
  }

  if (!isCustomerType(customerType)) {
    return NextResponse.json(
      { error: "customerType skal være 'privat' eller 'erhverv'" },
      { status: 400 },
    );
  }

  const selectedProducts = mockShopData.products.filter((product) =>
    productIds.includes(product.id),
  );

  if (selectedProducts.length === 0) {
    return NextResponse.json(
      { error: "Ingen af de valgte produkt-id'er blev fundet" },
      { status: 400 },
    );
  }

  const productsForPrompt = selectedProducts.map((product) => ({
    id: product.id,
    title: product.title,
    price: formatPriceForCustomer(product.price, customerType),
    imageUrl: product.imageUrl,
    url: product.url,
    productType: product.productType,
  }));

  const { systemPrompt, userPrompt } = buildNewsletterUserPrompt(
    {
      storeName: mockShopData.storeName,
      brandTone: mockShopData.brandTone,
      products: productsForPrompt,
    },
    { customerType, instructions },
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

    const newsletter = JSON.parse(text);
    // Overskriver AI'ens eget cta.url-valg med den deterministiske logik
    // herover – AI'en må stadig selv formulere cta.text.
    newsletter.cta = { ...newsletter.cta, url: resolveCtaUrl(selectedProducts) };
    return NextResponse.json(newsletter);
  } catch (err) {
    console.error("generate-newsletter fejlede:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere nyhedsbrevet lige nu. Prøv igen." },
      { status: 502 },
    );
  }
}
