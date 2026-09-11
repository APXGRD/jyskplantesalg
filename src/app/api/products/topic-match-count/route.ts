// src/app/api/products/topic-match-count/route.ts
//
// POST: kører NØJAGTIG samme fritekstsøgning/filtre som generate-newsletter/
// route.ts (searchCachedProductsByTopic), men UDEN maxResults-afskæring og
// UDEN noget AI-kald – bruges KUN til Opsætnings-sidens live "X produkter
// matcher, viser de første N"-note ved siden af "Maks. antal produkter"-
// feltet (se OpsaetningClient.tsx), så noten kan opdateres, mens brugeren
// stadig redigerer felterne, uden at generere et helt nyhedsbrev (som i
// forvejen navigerer væk fra siden med det samme ved succes).

import { NextRequest, NextResponse } from "next/server";
import { searchCachedProductsByTopic } from "@/lib/cachedProducts";

interface TopicMatchCountBody {
  instructions?: string;
  topicOnlyWithImage?: boolean;
  topicMinPrice?: number;
  topicMaxPrice?: number;
  topicPlantForm?: string;
}

// Samme parseOptionalPrice-logik som generate-newsletter/route.ts – bevidst
// ikke delt via et fælles modul, da hver route i forvejen er selvstændig
// (samme mønster som resten af projektets API-routes).
function parseOptionalPrice(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export async function POST(req: NextRequest) {
  let body: TopicMatchCountBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const { instructions, topicOnlyWithImage, topicMinPrice, topicMaxPrice, topicPlantForm } = body;
  const trimmedInstructions = typeof instructions === "string" ? instructions.trim() : "";
  const trimmedPlantForm = typeof topicPlantForm === "string" ? topicPlantForm.trim() : "";

  if (trimmedInstructions.length === 0) {
    return NextResponse.json({ totalMatchCount: 0 });
  }

  try {
    const { totalMatchCount } = await searchCachedProductsByTopic(trimmedInstructions, {
      onlyWithImage: topicOnlyWithImage === true,
      minPrice: parseOptionalPrice(topicMinPrice),
      maxPrice: parseOptionalPrice(topicMaxPrice),
      plantForm: trimmedPlantForm || undefined,
    });
    return NextResponse.json({ totalMatchCount });
  } catch (err) {
    console.error("Kunne ikke optælle matchende produkter:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke optælle matchende produkter." },
      { status: 502 },
    );
  }
}
