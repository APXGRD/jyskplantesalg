// src/app/api/generate-newsletter/route.ts
//
// Modtager Opsætnings-sidens ene samlede tekstfelt ("Beskriv dit nyhedsbrev") + målgruppe,
// bruger feltets tekst SOM fritekst-søgeord til at finde produkter i den lokale
// Supabase-cache (searchCachedProductsByTopic – samme cache som "Vælg produkter"-siden og
// NewsletterContext.setResult allerede bruger, IKKE det direkte, fuldt paginerede
// fetchShopifyProducts, som tidligere gjorde netop dette kald til den suverænt største
// flaskehals i hele generérings-flowet), bygger AI-prompten og beder Gemini om at generere
// nyhedsbrevets fire felter (heading/bodyText/image/cta) som struktureret JSON.
//
// Manuelt produktvalg ("Vælg produkter"-siden) er IKKE længere en vej til at generere et
// nyhedsbrev – det samlede tekstfelt er den eneste. Feltets tekst bruges ALTID BÅDE som
// søgeord (for at finde produkterne) OG som AI'ens tone-/fokus-instruks samtidig.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { resolveCtaLink } from "@/lib/ctaLink";
import { searchCachedProductsByTopic } from "@/lib/cachedProducts";
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
  customerType?: CustomerType;
  // Opsætnings-sidens ENE samlede tekstfelt ("Beskriv dit nyhedsbrev" –
  // tidligere to adskilte felter, "Emne" og "Yderligere instrukser",
  // konsolideret til ét). Bruges ALTID BÅDE som fritekst-søgeord til at
  // finde produkter (searchCachedProductsByTopic) OG som AI'ens tone-/
  // fokus-instruks (buildNewsletterUserPrompt) – de to bruger PRÆCIS samme
  // tekst, ikke to forskellige felter.
  instructions?: string;
  // Skabelonens id fra "Skabelon"-dropdownen på Opsætnings-siden – undefined/
  // null betyder "Standard layout" (nuværende, faste blok-struktur).
  templateId?: string | null;
  // "Kun med billede"-kontakten ved siden af det samlede felt, se
  // searchCachedProductsByTopic.
  topicOnlyWithImage?: boolean;
  // Valgfrit prisinterval-filter, fra "Min. pris"/"Maks. pris"-felterne ved
  // siden af "Kun med billede"-kontakten – undefined/manglende betyder
  // "intet filter på den grænse", se searchCachedProductsByTopic.
  topicMinPrice?: number;
  topicMaxPrice?: number;
  // Valgfrit "Planteform"-filter (vækstform – Multistammet, Søjleformet
  // osv., fra Shopifys custom.planteform-metafelt) – undefined/tom streng
  // betyder "Alle" (intet filter), se searchCachedProductsByTopic.
  topicPlantForm?: string;
}

// Et tal, hvis værdien reelt ER et brugbart, ikke-negativt tal – ellers
// undefined, så et ugyldigt/tomt prisfelt roligt behandles som "intet
// filter på den grænse" i stedet for at fejle hele genereringen.
function parseOptionalPrice(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
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

  const {
    customerType,
    instructions,
    templateId,
    topicOnlyWithImage,
    topicMinPrice,
    topicMaxPrice,
    topicPlantForm,
  } = body;
  const trimmedInstructions = typeof instructions === "string" ? instructions.trim() : "";
  const minPrice = parseOptionalPrice(topicMinPrice);
  const maxPrice = parseOptionalPrice(topicMaxPrice);
  const trimmedPlantForm = typeof topicPlantForm === "string" ? topicPlantForm.trim() : "";

  if (trimmedInstructions.length === 0) {
    return NextResponse.json(
      { error: "Beskriv dit nyhedsbrev, før du kan generere" },
      { status: 400 },
    );
  }

  if (!isCustomerType(customerType)) {
    return NextResponse.json(
      { error: "customerType skal være 'privat' eller 'erhverv'" },
      { status: 400 },
    );
  }

  // De ORIGINALE (u-normaliserede) søgeord, der rent faktisk gav mindst ét
  // matchende produkt (se searchCachedProductsByTopic/matchedWords,
  // cachedProducts.ts) – IKKE alle "ikke-stopord" fra feltet. Bruges
  // UDELUKKENDE til CTA-knappens søgeside-fallback-link (se resolveCtaLink
  // herunder) – AI-promptens egen topicSearchTerm (buildNewsletterUserPrompt)
  // bruger fortsat den FULDE trimmedInstructions, uændret.
  let selectedProducts: ShopifyProduct[];
  let matchedSearchWords: string[];
  try {
    const searchResult = await searchCachedProductsByTopic(trimmedInstructions, {
      onlyWithImage: topicOnlyWithImage === true,
      minPrice,
      maxPrice,
      plantForm: trimmedPlantForm || undefined,
    });
    selectedProducts = searchResult.products;
    matchedSearchWords = searchResult.matchedWords;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke søge efter produkter." },
      { status: 502 },
    );
  }
  if (selectedProducts.length === 0) {
    // Samme fejlbesked-mønster som hidtil – blot udvidet til også at nævne
    // ethvert AKTIVT ekstra filter (prisinterval og/eller planteform), når det
    // (og ikke kun selve teksten) er årsagen til, at kombinationen ikke
    // giver nogen resultater.
    const filterNotes: string[] = [];
    if (minPrice !== undefined || maxPrice !== undefined) filterNotes.push("det angivne prisinterval");
    if (trimmedPlantForm) filterNotes.push(`planteformen "${trimmedPlantForm}"`);
    const message =
      filterNotes.length > 0
        ? `Ingen produkter matcher '${trimmedInstructions}' inden for ${filterNotes.join(" og ")}`
        : `Ingen produkter matcher '${trimmedInstructions}'`;
    return NextResponse.json({ error: message }, { status: 400 });
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
    { customerType, instructions: trimmedInstructions, topicSearchTerm: trimmedInstructions },
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
    // matchende søgeord (matchedSearchWords, IKKE den fulde feltværdi)
    // bruges til resolveCtaLink's søgeside-fallback i ctaLink.ts.
    newsletter.cta = {
      ...newsletter.cta,
      url: resolveCtaLink(selectedProducts, matchedSearchWords.join(" ")),
    };

    // ÉT repræsentativt produkt (bestseller, ellers det først fundne) til
    // den initiale billede-blok – IKKE automatisk et galleri, selvom flere
    // produkter matchede søgningen (afviger bevidst fra den almindelige
    // "flere produkter = automatisk galleri"-regel). Overskriver samtidig
    // AI'ens eget image-valg, af samme grund som cta.url ovenfor: det skal
    // være deterministisk, ikke AI'ens gæt. blockSeedProducts er DERFOR kun
    // det ene produkt – createDefaultBlocks/createBlocksFromTemplate vælger
    // selv layout "1 billede" frem for et galleri-layout, når der kun er ét
    // produkt at bygge ud fra (se MediaLayout i newsletterBlocks.ts).
    // matchedProductIds er derimod HELE det matchede sæt, sendt med i svaret
    // til NewsletterContext (se setResult), så Edit-mode's billede-/
    // galleri-blok-vælger kan tilbyde alle søgnings-matches, ikke kun det
    // ene viste.
    const representative = selectedProducts.find(isBestSeller) ?? selectedProducts[0];
    newsletter.image = {
      productId: representative.id,
      imageUrl: representative.imageUrl,
      altText: representative.title,
    };
    const blockSeedProducts = [representative];
    const matchedProductIds = selectedProducts.map((product) => product.id);

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

    // topicSearchTerm sendes med (parallelt med matchedProductIds), så
    // NewsletterContext kan gemme de bekræftet-matchende søgeord sammen med
    // resultatet – EditorBlockList.tsx bruger det til at genberegne
    // resolveCtaLink()'s søgeside-fallback client-side, uanset hvilken blok
    // der senest blev ændret (se applyCtaLinkUpdate). BEMÆRK: dette er
    // matchedSearchWords (kun de ord, der faktisk gav resultat), IKKE den
    // fulde, rå feltværdi – til forskel fra buildNewsletterUserPrompt-kaldet
    // ovenfor, som fortsat bruger HELE trimmedInstructions til selve
    // AI-tekstens tone/kategori-note.
    return NextResponse.json({
      ...newsletter,
      blocks,
      matchedProductIds,
      topicSearchTerm: matchedSearchWords.join(" "),
    });
  } catch (err) {
    console.error("generate-newsletter fejlede:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere nyhedsbrevet lige nu. Prøv igen." },
      { status: 502 },
    );
  }
}
