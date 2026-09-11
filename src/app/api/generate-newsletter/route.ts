// src/app/api/generate-newsletter/route.ts
//
// Modtager de valgte produkt-id'er (manuelt valgt på "Vælg produkter"-siden) OG/ELLER
// Opsætnings-sidens ene samlede tekstfelt ("Beskriv dit nyhedsbrev") + målgruppe, slår
// produkterne op i den lokale Supabase-cache (getCachedProducts/searchCachedProductsByTopic
// – samme cache som "Vælg produkter"-siden og NewsletterContext.setResult allerede bruger,
// IKKE det direkte, fuldt paginerede fetchShopifyProducts, som tidligere gjorde netop dette
// kald til den suverænt største flaskehals i hele generérings-flowet), bygger AI-prompten
// og beder Gemini om at generere nyhedsbrevets fire felter (heading/bodyText/image/cta) som
// struktureret JSON.
//
// Er der INGEN manuelt valgte produkter, bruges tekstfeltet SOM fritekst-søgeord til at
// finde produkter (se isTopicSearch herunder) – er der derimod valgt produkter, bruges
// tekstfeltet UDELUKKENDE som AI'ens tone-instruks. De to bruges aldrig samtidig til at
// vælge produkter.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { resolveCtaLink } from "@/lib/ctaLink";
import { getCachedProducts, searchCachedProductsByTopic } from "@/lib/cachedProducts";
import { getBrandSettings } from "@/lib/brandSettings";
import { getSupabaseClient } from "@/lib/supabase";
import {
  createBlocksFromTemplate,
  isBestSeller,
  type NewsletterBlock,
  type TemplateBlock,
} from "@/lib/newsletterBlocks";
import { buildNewsletterUserPrompt } from "@/lib/prompts/newsletterPrompt";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";

interface GenerateNewsletterBody {
  productIds?: string[];
  customerType?: CustomerType;
  // Opsætnings-sidens ENE samlede tekstfelt ("Beskriv dit nyhedsbrev" –
  // tidligere to adskilte felter, "Emne" og "Yderligere instrukser").
  // Sendes ALTID til AI'en som tone-/fokus-instruks. Er productIds tom
  // (intet manuelt produktvalg på "Vælg produkter"-siden), bruges DEN SAMME
  // tekst DESUDEN som fritekst-søgeord for automatisk at finde produkter
  // (se isTopicSearch herunder) – er der derimod manuelt valgte produkter,
  // køres ingen søgning, siden produkterne allerede er givet.
  instructions?: string;
  // Skabelonens id fra "Skabelon"-dropdownen på Opsætnings-siden – undefined/
  // null betyder "Standard layout" (nuværende, faste blok-struktur).
  templateId?: string | null;
  // "Kun med billede"-kontakten ved siden af det samlede felt – kun
  // relevant, når feltet reelt bruges til søgning (isTopicSearch), se
  // searchCachedProductsByTopic.
  topicOnlyWithImage?: boolean;
}

// Henter skabelonens gemte block_structure fra Supabase. Kastes der en fejl
// (skabelonen findes ikke længere, Supabase utilgængelig osv.), fanges det
// af kalderen – hele genereringen skal IKKE fejle, blot fordi den valgte
// skabelon ikke kunne hentes; den falder da roligt tilbage til
// standard-strukturen, som hvis "Standard layout" var valgt.
async function fetchTemplateBlockStructure(templateId: string): Promise<TemplateBlock[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .select("block_structure")
    .eq("id", templateId)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data?.block_structure)) {
    throw new Error("Skabelonens block_structure er ugyldig");
  }
  return data.block_structure as TemplateBlock[];
}

function isCustomerType(value: unknown): value is CustomerType {
  return value === "privat" || value === "erhverv";
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

  const { productIds, customerType, instructions, templateId, topicOnlyWithImage } = body;
  const trimmedInstructions = typeof instructions === "string" ? instructions.trim() : "";
  const hasManualProducts = Array.isArray(productIds) && productIds.length > 0;
  // Fritekst-søgning køres KUN, når INGEN produkter er manuelt valgt – er
  // der valgt produkter, bruges instructions UDELUKKENDE som tone-instruks
  // til AI'en (se buildNewsletterUserPrompt-kaldet herunder), som hidtil.
  const isTopicSearch = !hasManualProducts && trimmedInstructions.length > 0;

  if (!hasManualProducts && trimmedInstructions.length === 0) {
    return NextResponse.json(
      { error: "Mindst ét produkt skal vælges (productIds), eller angiv en beskrivelse" },
      { status: 400 },
    );
  }

  if (!isCustomerType(customerType)) {
    return NextResponse.json(
      { error: "customerType skal være 'privat' eller 'erhverv'" },
      { status: 400 },
    );
  }

  let selectedProducts: ShopifyProduct[];
  // De ORIGINALE (u-normaliserede) søgeord, der rent faktisk gav mindst ét
  // matchende produkt (se searchCachedProductsByTopic/matchedWords,
  // cachedProducts.ts) – IKKE alle "ikke-stopord" fra feltet. Bruges
  // UDELUKKENDE til CTA-knappens søgeside-fallback-link (se resolveCtaLink
  // herunder) – AI-promptens egen topicSearchTerm (buildNewsletterUserPrompt)
  // bruger fortsat den FULDE trimmedInstructions, uændret.
  let matchedSearchWords: string[] = [];
  if (isTopicSearch) {
    try {
      const searchResult = await searchCachedProductsByTopic(trimmedInstructions, topicOnlyWithImage === true);
      selectedProducts = searchResult.products;
      matchedSearchWords = searchResult.matchedWords;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Kunne ikke søge efter produkter." },
        { status: 502 },
      );
    }
    if (selectedProducts.length === 0) {
      return NextResponse.json({ error: `Ingen produkter matcher '${trimmedInstructions}'` }, { status: 400 });
    }
  } else {
    let allProducts: ShopifyProduct[];
    try {
      allProducts = (await getCachedProducts()).products;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Kunne ikke hente produkter." },
        { status: 502 },
      );
    }
    selectedProducts = allProducts.filter((product) => (productIds ?? []).includes(product.id));
    if (selectedProducts.length === 0) {
      return NextResponse.json(
        { error: "Ingen af de valgte produkt-id'er blev fundet" },
        { status: 400 },
      );
    }
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

  const { systemPrompt, userPrompt } = buildNewsletterUserPrompt(
    {
      storeName: brandSettings.company_name,
      brandTone: brandSettings.brand_tone,
      products: productsForPrompt,
    },
    { customerType, instructions: trimmedInstructions || undefined, topicSearchTerm: isTopicSearch ? trimmedInstructions : undefined },
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
    // herover – AI'en må stadig selv formulere cta.text. De bekræftet-
    // matchende søgeord (matchedSearchWords, IKKE den fulde feltværdi) gives
    // kun med ved fritekst-søgning (se resolveCtaLink's søgeside-fallback i
    // ctaLink.ts).
    newsletter.cta = {
      ...newsletter.cta,
      url: resolveCtaLink(selectedProducts, isTopicSearch ? matchedSearchWords.join(" ") : undefined),
    };

    // Emne-søgning: ÉT repræsentativt produkt (bestseller, ellers det først
    // fundne) til den initiale billede-blok – IKKE automatisk et galleri,
    // selvom flere produkter matchede emnet (afviger bevidst fra den
    // almindelige "flere valgte produkter = automatisk galleri"-regel, kun
    // her). Overskriver samtidig AI'ens eget image-valg, af samme grund som
    // cta.url ovenfor: det skal være deterministisk, ikke AI'ens gæt.
    // blockSeedProducts er DERFOR kun det ene produkt, når emne-søgning er
    // brugt – createDefaultBlocks/createBlocksFromTemplate vælger selv
    // layout "1 billede" frem for et galleri-layout, når der kun er ét
    // produkt at bygge ud fra (se MediaLayout i newsletterBlocks.ts).
    // matchedProductIds er derimod HELE det matchede sæt, sendt med i svaret
    // til NewsletterContext (se setResult), så Edit-mode's billede-/
    // galleri-blok-vælger kan tilbyde alle emne-matches, ikke kun det ene viste.
    let blockSeedProducts = selectedProducts;
    let matchedProductIds: string[] | undefined;
    if (isTopicSearch) {
      const representative = selectedProducts.find(isBestSeller) ?? selectedProducts[0];
      newsletter.image = {
        productId: representative.id,
        imageUrl: representative.imageUrl,
        altText: representative.title,
      };
      blockSeedProducts = [representative];
      matchedProductIds = selectedProducts.map((product) => product.id);
    }

    // Er en skabelon valgt (frem for "Standard layout"), bygges hele
    // blocks-arrayet HER server-side ud fra dens gemte struktur/styling – se
    // createBlocksFromTemplate. Fejler det (skabelonen findes ikke længere,
    // Supabase utilgængelig osv.), falder vi roligt tilbage til INGEN
    // `blocks`-felt i svaret, præcis som når "Standard layout" er valgt –
    // NewsletterContext.setResult bygger da selv blocks-listen via
    // createDefaultBlocks, som hidtil.
    let blocks: NewsletterBlock[] | undefined;
    if (typeof templateId === "string" && templateId) {
      try {
        const templateBlockStructure = await fetchTemplateBlockStructure(templateId);
        blocks = createBlocksFromTemplate(templateBlockStructure, newsletter, customerType, blockSeedProducts, {
          primaryColor: brandSettings.brand_colors[0],
          primaryFont: brandSettings.primary_font,
        });
      } catch (err) {
        console.error("Kunne ikke anvende den valgte skabelon (fortsætter med standard layout):", err);
      }
    }

    // topicSearchTerm sendes med (parallelt med matchedProductIds) ved
    // fritekst-søgning, så NewsletterContext kan gemme de bekræftet-
    // matchende søgeord sammen med resultatet – EditorBlockList.tsx bruger
    // det til at genberegne resolveCtaLink()'s søgeside-fallback client-side,
    // uanset hvilken blok der senest blev ændret (se applyCtaLinkUpdate).
    // BEMÆRK: dette er matchedSearchWords (kun de ord, der faktisk gav
    // resultat), IKKE den fulde, rå feltværdi – til forskel fra
    // buildNewsletterUserPrompt-kaldet ovenfor, som fortsat bruger HELE
    // trimmedInstructions til selve AI-tekstens tone/kategori-note.
    return NextResponse.json({
      ...newsletter,
      blocks,
      matchedProductIds,
      topicSearchTerm: isTopicSearch ? matchedSearchWords.join(" ") : undefined,
    });
  } catch (err) {
    console.error("generate-newsletter fejlede:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere nyhedsbrevet lige nu. Prøv igen." },
      { status: 502 },
    );
  }
}
