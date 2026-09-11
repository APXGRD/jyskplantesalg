// src/app/api/generate-newsletter/route.ts
//
// Modtager ENTEN de valgte produkt-id'er (manuelt valgt på "Vælg produkter"-siden)
// ELLER et fritekst-emne (det nye "Emne"-felt på Opsætnings-siden – se
// searchCachedProductsByTopic) + målgruppe + evt. instrukser, slår produkterne op i den
// lokale Supabase-cache (getCachedProducts/searchCachedProductsByTopic – samme cache som
// "Vælg produkter"-siden og NewsletterContext.setResult allerede bruger, IKKE det
// direkte, fuldt paginerede fetchShopifyProducts, som tidligere gjorde netop dette kald
// til den suverænt største flaskehals i hele generérings-flowet), bygger AI-prompten og
// beder Gemini om at generere nyhedsbrevets fire felter (heading/bodyText/image/cta) som
// struktureret JSON.
//
// Er "Emne" udfyldt, VINDER det altid over productIds (se isTopicSearch herunder) – de
// to er alternative, sideordnede måder at vælge produkter på, aldrig kombineret.

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
  instructions?: string;
  // Skabelonens id fra "Skabelon"-dropdownen på Opsætnings-siden – undefined/
  // null betyder "Standard layout" (nuværende, faste blok-struktur).
  templateId?: string | null;
  // Fritekst-emne fra det nye "Emne (valgfrit)"-felt på Opsætnings-siden –
  // udfyldt betyder "find produkter via tekstsøgning" i stedet for at bruge
  // productIds, se isTopicSearch herunder.
  topic?: string;
  // "Kun med billede"-kontakten ved siden af Emne-feltet – kun relevant,
  // når topic er udfyldt, se searchCachedProductsByTopic.
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

  const { productIds, customerType, instructions, templateId, topic, topicOnlyWithImage } = body;
  const trimmedTopic = typeof topic === "string" ? topic.trim() : "";
  const isTopicSearch = trimmedTopic.length > 0;

  if (!isTopicSearch && (!Array.isArray(productIds) || productIds.length === 0)) {
    return NextResponse.json(
      { error: "Mindst ét produkt skal vælges (productIds), eller angiv et emne" },
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
  if (isTopicSearch) {
    try {
      selectedProducts = await searchCachedProductsByTopic(trimmedTopic, topicOnlyWithImage === true);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Kunne ikke søge efter produkter." },
        { status: 502 },
      );
    }
    if (selectedProducts.length === 0) {
      return NextResponse.json({ error: `Ingen produkter matcher '${trimmedTopic}'` }, { status: 400 });
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
    { customerType, instructions, topicSearchTerm: isTopicSearch ? trimmedTopic : undefined },
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
    // herover – AI'en må stadig selv formulere cta.text. topic gives kun med
    // ved emne-søgning (se resolveCtaLink's søgeside-fallback i ctaLink.ts).
    newsletter.cta = { ...newsletter.cta, url: resolveCtaLink(selectedProducts, isTopicSearch ? trimmedTopic : undefined) };

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
    // emne-søgning, så NewsletterContext kan gemme det oprindelige emne-ord
    // sammen med resultatet – EditorBlockList.tsx bruger det til at
    // genberegne resolveCtaLink()'s søgeside-fallback client-side, uanset
    // hvilken blok der senest blev ændret (se applyCtaLinkUpdate).
    return NextResponse.json({
      ...newsletter,
      blocks,
      matchedProductIds,
      topicSearchTerm: isTopicSearch ? trimmedTopic : undefined,
    });
  } catch (err) {
    console.error("generate-newsletter fejlede:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere nyhedsbrevet lige nu. Prøv igen." },
      { status: 502 },
    );
  }
}
