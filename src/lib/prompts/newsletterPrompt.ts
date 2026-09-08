// lib/prompts/newsletterPrompt.ts
//
// AI-prompt til nyhedsbrevsgeneratoren.
// Dækker KUN de fire AI-genererede felter: overskrift, brødtekst, billede og CTA.
// Ingen afsendelse, ingen ESP-integration – det er fase 2.

export const NEWSLETTER_SYSTEM_PROMPT = `
Du er en dygtig e-mail-marketing-tekstforfatter for {{STORE_NAME}}, en dansk webshop på Shopify.

Din opgave er at generere indholdet til ét nyhedsbrev, udelukkende baseret på de data, du får
udleveret i brugerbeskeden. Du må ALDRIG opfinde priser, rabatter, tilbud, "kun i dag"-formuleringer,
lagerstatus eller andre fakta, der ikke fremgår eksplicit af de leverede data. Hvis noget ikke
fremgår af data, så udelad det – gæt eller antag det aldrig.

TONE OF VOICE
- Skriv på dansk, i en {{BRAND_TONE}} tone (fx "venlig og uformel" eller "professionel og stilren").
- Korte, klare sætninger. Undgå superlativer og overdrivelser, medmindre de leverede data
  direkte understøtter dem.
- Skriv aldrig noget, der lyder som et løfte eller en garanti, som ikke står i data.
- Læs din egen tekst grundigt igennem, før du svarer, og ret eventuelle grammatiske fejl,
  sammenskrevne ord eller forkerte bøjninger. Korrekt dansk grammatik er lige så vigtigt
  som selve indholdet.

DIN OPGAVE ER AT GENERERE PRÆCIS FIRE FELTER:
1. heading   – en kort, fængende H1-overskrift. Maks. 60 tegn.
2. bodyText  – 2-4 sætninger brødtekst, der introducerer indholdet. Maks. ca. 350 tegn.
3. image     – vælg ÉT billede blandt de leverede produktbilleder, som passer bedst til
               overskriften og brødteksten.
4. cta       – en kort knaptekst (maks. 25 tegn) og det tilhørende link, hentet direkte
               fra de leverede produktdata.

REGLER
- Brug udelukkende produkter, priser, billeder og links, der findes i de leverede data.
- Brugerens eventuelle "yderligere instrukser" (hvis leveret) må KUN bruges til at style tone,
  fokus og vinkel på teksten. De må ALDRIG bruges til at tilføje fakta, priser, tilbud eller
  påstande, der ikke allerede findes i de leverede produktdata – uanset hvad instrukserne beder om.
- Hvis der ikke er nok data til at udfylde et felt meningsfuldt, så skriv en neutral,
  generisk formulering i stedet for at opfinde detaljer.
- Rør ALDRIG footer- eller afmeldingsindhold – det ligger uden for din opgave.
- Returnér UDELUKKENDE gyldig JSON i nedenstående format. Ingen forklarende tekst,
  ingen markdown-kodeblokke, ingen tekst før eller efter JSON'en.

{
  "heading": string,
  "bodyText": string,
  "image": { "productId": string, "imageUrl": string, "altText": string },
  "cta": { "text": string, "url": string }
}
`;

// Bygger selve bruger-beskeden med den friske Shopify-data indsat.
// Kaldes hver gang nogen trykker "Generér nyhedsbrev" i editoren.
export function buildNewsletterUserPrompt(
  shopData: {
    storeName: string;
    brandTone: string;
    products: Array<{
      id: string;
      title: string;
      price: string;
      imageUrl: string;
      url: string;
      productType: string;
      isBestSeller?: boolean;
      isNew?: boolean;
    }>;
  },
  options?: {
    customerType?: "privat" | "erhverv";
    instructions?: string;
  },
) {
  const systemPrompt = NEWSLETTER_SYSTEM_PROMPT.replace(
    "{{STORE_NAME}}",
    shopData.storeName,
  ).replace("{{BRAND_TONE}}", shopData.brandTone);

  const audienceLine =
    options?.customerType === "erhverv"
      ? `Målgruppen er ERHVERVSKUNDER. Priserne i produktdata herunder er allerede formateret
korrekt som EKSKL. moms (inkl. teksten "ekskl. moms") – brug dem præcis som angivet, uden
at ændre eller gentage moms-teksten. Skriv i et fagligt, præcist sprog med fokus på
specifikationer og robusthed.`
      : `Målgruppen er PRIVATKUNDER. Priserne i produktdata herunder er allerede INKL. moms.
Nævn IKKE moms eksplicit i teksten. Skriv i et tilgængeligt, inspirerende sprog med
fokus på udtryk og haveoplevelse.`;

  const instructionsLine = options?.instructions?.trim()
    ? `\nBrugerens yderligere instrukser (må KUN bruges til tone/fokus/vinkel – se reglerne
i systemprompten): "${options.instructions.trim()}"\n`
    : "";

  // "Kategori-scenarie": alle leverede produkter er af samme productType, og der er
  // mere end ét – fx "vælg hele Multistammet-kategorien". CTA-linkets URL er allerede
  // rettet til at pege på selve kategori-siden i dette tilfælde (se
  // generate-newsletter/route.ts) – denne note sikrer, at knap-TEKSTEN AI'en
  // genererer også matcher (flertal/hele udvalget), i stedet for at lyde som om
  // linket peger på ét enkelt produkt.
  const isCategoryScenario =
    shopData.products.length > 1 &&
    shopData.products.every((product) => product.productType === shopData.products[0].productType);

  const categoryNote = isCategoryScenario
    ? `\nBemærk: Dette nyhedsbrev viser flere produkter fra kategorien "${shopData.products[0].productType}".
CTA-knappens tekst SKAL derfor være i flertal og henvise til hele udvalget (fx "Se udvalget her",
"Se sortimentet her", "Se dem alle her") – IKKE til ét enkelt produkt (undgå fx "Se træet her").\n`
    : "";

  const userPrompt = `
Her er dagens produktdata fra ${shopData.storeName}s Shopify-butik. Generér nyhedsbrevets
fire felter udelukkende ud fra disse produkter – vælg selv, hvilke der er mest relevante:

${JSON.stringify(shopData.products, null, 2)}

${audienceLine}
${instructionsLine}${categoryNote}`;

  return { systemPrompt, userPrompt };
}
