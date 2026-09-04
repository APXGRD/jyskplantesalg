// src/app/api/generate-newsletter/route.ts
//
// Modtager de valgte produkt-id'er + målgruppe + evt. instrukser fra Opsætnings-siden,
// slår produkterne op i mockShopData, bygger AI-prompten og beder Gemini om at generere
// nyhedsbrevets fire felter (heading/bodyText/image/cta) som struktureret JSON.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { mockShopData } from "@/lib/mock/mockShopifyData";
import { buildNewsletterUserPrompt } from "@/lib/prompts/newsletterPrompt";
import { formatPrice } from "@/lib/format";

type CustomerType = "privat" | "erhverv";

interface GenerateNewsletterBody {
  productIds?: string[];
  customerType?: CustomerType;
  instructions?: string;
}

function isCustomerType(value: unknown): value is CustomerType {
  return value === "privat" || value === "erhverv";
}

// Erhvervspriser vises ekskl. moms (prisen i mockData er inkl. 25% moms).
function formatPriceForCustomer(price: number, customerType: CustomerType): string {
  if (customerType === "erhverv") {
    const priceExVat = Math.round((price / 1.25) * 100) / 100;
    return `${priceExVat.toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kr`;
  }
  return formatPrice(price);
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
    return NextResponse.json(newsletter);
  } catch (err) {
    console.error("generate-newsletter fejlede:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere nyhedsbrevet lige nu. Prøv igen." },
      { status: 502 },
    );
  }
}
