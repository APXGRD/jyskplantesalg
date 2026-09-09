// Fælles blok-model for nyhedsbrevet. Bruges af både Edit-mode (drag-and-drop,
// duplikér/skjul/slet/tilføj) og Preview-visningen samt "Kopiér nyhedsbrev", så
// alle tre altid viser/eksporterer nøjagtig det samme sæt blokke, i samme
// rækkefølge, med samme synlighed og samme indhold.

import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import type { CustomerType } from "@/lib/format";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { FONT_FAMILIES } from "@/lib/fontFamilies";

// De brand-værdier (fra Indstillinger/Supabase), et FRISKT nyhedsbrev skal
// starte med som udgangspunkt – IKKE en låsning, brugeren kan altid ændre
// det bagefter via de fire farve-swatches/skrifttype-vælgeren i Edit-mode.
// primaryFont er FONT_FAMILIES' label (fx "Georgia"), samme kontrakt som
// settings-tabellens primary_font-kolonne.
export interface BrandDefaults {
  primaryColor: string;
  primaryFont: string;
}

// Slår primaryFont's label op i FONT_FAMILIES for at få den fulde CSS-
// font-family-værdi (med fallback-stak) – falder tilbage til første
// web-safe skrifttype, hvis label'et af en eller anden grund ikke matcher
// nogen af de otte (fx en fremtidig værdi, appen ikke kender endnu).
function resolveFontFamily(primaryFont: string): string {
  return FONT_FAMILIES.find((font) => font.label === primaryFont)?.value ?? FONT_FAMILIES[0].value;
}

export type BlockType =
  | "header"
  | "overskrift"
  | "brodtekst"
  | "billede"
  | "produktvisning"
  | "skillelinje"
  | "cta"
  | "footer"
  // Typer der (kun) kan tilføjes via "+ Tilføj blok":
  | "tekst"
  | "img"
  | "produkt"
  | "galleri";

export type ImageAlignment = "venstre" | "center" | "hoejre";
export type ImageSize = "lille" | "mellem" | "fuld";

// Fast bredde pr. størrelse, brugt både i Preview og i den kopierede HTML.
export const IMAGE_SIZE_PX: Record<ImageSize, string> = {
  lille: "200px",
  mellem: "400px",
  fuld: "100%",
};

export const IMAGE_ALIGN_CSS: Record<ImageAlignment, "left" | "center" | "right"> = {
  venstre: "left",
  center: "center",
  hoejre: "right",
};

// CTA-knappens kuraterede padding-valg – anvendes 1:1 i både Preview og den
// tabel-baserede, Outlook-kompatible eksport, så de to altid matcher.
export type CtaPadding = "kompakt" | "normal" | "rummelig";

export const CTA_PADDING_PX: Record<CtaPadding, { vertical: number; horizontal: number }> = {
  kompakt: { vertical: 8, horizontal: 16 },
  normal: { vertical: 11, horizontal: 22 },
  rummelig: { vertical: 14, horizontal: 28 },
};

// CTA-knappens kuraterede hjørne-former. Outlook ignorerer border-radius og
// falder pænt tilbage til skarpe hjørner uanset værdi her – acceptabelt,
// jf. opgavebeskrivelsen.
export type CtaBorderRadius = "skarp" | "afrundet" | "pille";

export const CTA_BORDER_RADIUS_PX: Record<CtaBorderRadius, number> = {
  skarp: 0,
  afrundet: 8,
  pille: 999,
};

// "udfyldt" (standard) = baggrundsfarve fra bgColor. "kontur" = ingen
// baggrund, kun en 2px kant og tekst i bgColor's farve – samme farvefelt
// genbruges bare med en anden visuel betydning afhængig af stilen.
export type CtaStyle = "udfyldt" | "kontur";

// "Billedgalleri"-blokkens tre kuraterede layout-valg – bevidst ingen fri
// indtastning af antal, jf. opgavebeskrivelsen. "6" er IKKE 6 kolonner i én
// række, men "6 billeder" – 2 rækker × 3 kolonner (se GALLERY_ROW_SIZE_PX
// og rendering i NewsletterCard.tsx/newsletterExport.ts).
export type GalleryColumns = 2 | 3 | 6;

// Fast billedbredde pr. layout-valg i den kopierede, tabel-baserede HTML
// (samme Outlook-kompatible teknik som CTA-knappen bruger – CSS
// flexbox/grid understøttes ikke pålideligt af Outlook, så billederne skal
// side om side via en <table>, ikke via CSS-layout). "6 billeder" bruger
// samme billedbredde som 3-kolonne-layoutet, jf. opgavebeskrivelsen.
export const GALLERY_IMAGE_WIDTH_PX: Record<GalleryColumns, number> = {
  2: 280,
  3: 180,
  6: 180,
};

// Antal billeder pr. række/tabel – bruges til at bryde "6 billeder"-layoutet
// op i to efterfølgende 3-kolonne-rækker (i stedet for én 6-cellers tabel/
// grid-række), både i Preview (CSS grid ombryder automatisk til 2 rækker
// ved 3 kolonner) og i den kopierede HTML (to selvstændige <table>'er).
export const GALLERY_ROW_SIZE: Record<GalleryColumns, number> = {
  2: 2,
  3: 3,
  6: 3,
};

export interface NewsletterBlock {
  id: string;
  type: BlockType;
  hidden: boolean;
  // Kun relevant for tekst-blokke (overskrift/brodtekst/tekst/cta) – indholdet er
  // HTML fra TextBlockEditor (Tiptap). Hver blok-instans har sit eget, uafhængige
  // indhold, så en dupliceret eller ny blok kan redigeres separat fra andre.
  content?: string;
  // Kun relevant for "cta"-blokken.
  ctaUrl?: string;
  // Kun relevant for "produkt"-blokken (enkelt-produkt-visning).
  productId?: string;
  // Kun relevant for billede-blokke ("billede"/"img"). imageUrl er pt. en
  // base64 data-URI (client-side preview via FileReader) – se
  // ImageBlockControls.tsx. Uden imageUrl falder blokken tilbage til sin
  // eksisterende pladsholder-visning.
  imageUrl?: string;
  altText?: string;
  alignment?: ImageAlignment;
  size?: ImageSize;
  // Baggrundsfarve for hele blokken – kun relevant for "cta" (knappens
  // baggrund) og baggrunds-bærende struktur-blokke ("header"/"footer").
  // Uden bgColor bruges blokkens eksisterende standardfarve.
  bgColor?: string;
  // Blokkens skrifttype-udgangspunkt – kun relevant for tekst-blokke
  // (overskrift/brodtekst/tekst/cta), sat af den globale skrifttype-vælger i
  // Edit-mode (se FONT_FAMILIES). Et enkelt tekstudsnit inde i selve
  // "content"-HTML'en kan stadig afvige herfra via et Tiptap-mark fra den
  // per-blok værktøjslinje – det inline mark vinder naturligt over denne
  // block-brede standard i CSS-cascaden.
  fontFamily?: string;
  // Blokkens TEKSTFARVE-udgangspunkt – samme mønster som fontFamily herover,
  // sat af den globale farve-vælger i Edit-mode (BRAND_COLORS). For "cta" er
  // dette knap-TEKSTENS farve, ikke knappens baggrund (den styres fortsat
  // udelukkende af bgColor, kun pr. blok) – uden textColor bruger CTA'en sin
  // automatisk udregnede kontrastfarve i stedet.
  textColor?: string;
  // Kun relevant for "cta"-blokken – se CTA_PADDING_PX/CTA_BORDER_RADIUS_PX
  // ovenfor. Uden en værdi bruges nuværende standard (normal/afrundet/udfyldt).
  ctaPadding?: CtaPadding;
  ctaBorderRadius?: CtaBorderRadius;
  ctaStyle?: CtaStyle;
  // Kun relevant for "galleri"-blokken – de udvalgte produkters id'er (blandt
  // de produkter, der allerede er valgt på "Vælg produkter"-siden, samme
  // liste som resten af nyhedsbrevet bruger) og antal kolonner i layoutet.
  // Antallet af id'er holdes altid inden for galleryColumns af
  // GalleryBlockControls, så rendering aldrig skal håndtere flere billeder,
  // end layoutet reelt har plads til.
  galleryProductIds?: string[];
  galleryColumns?: GalleryColumns;
}

// De blok-typer, hvis indhold redigeres som fri tekst via TextBlockEditor
// (Tiptap) – dem, den globale skrifttype-vælger i Edit-mode sætter på én
// gang.
export const RICH_TEXT_BLOCK_TYPES: BlockType[] = ["overskrift", "brodtekst", "tekst", "cta"];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function greetingFor(customerType: CustomerType): string {
  return customerType === "erhverv" ? "Kære erhvervskunde," : "Kære privatkunde,";
}

// Fast afsluttende linje, der altid vises efter selve AI-brødteksten. Den er
// ikke en del af Geminis svar (bodyText er kun ÉT felt), men skal stadig være
// synlig OG redigerbar i Edit-mode – ikke kun i Preview – så den flettes ind i
// "brodtekst"-blokkens content som endnu et afsnit, i stedet for at blive
// tilføjet separat (og usynligt for Edit-mode) i selve render-laget.
const CLOSING_TEXT =
  "Ønsker du at se planterne på stedet eller modtage et uforpligtende tilbud? Kontakt os direkte – vi rådgiver gerne om valg og placering.";

// Bruges kun til at PRIORITERE blandt de allerede valgte produkter, når
// galleriet forudfyldes automatisk (se pickGalleryProducts) – ShopifyProduct
// har intet dedikeret isBestSeller-felt, så det nærmeste tilsvarende er et
// tag, der nævner "bestseller" (fx sat manuelt i Shopify-admin). Findes et
// sådant tag ikke på nok produkter, falder forudfyldningen roligt tilbage
// til de først valgte produkter i stedet for at fejle eller vise intet.
function isBestSeller(product: ShopifyProduct): boolean {
  return product.tags.some((tag) => /best[\s-]?seller/i.test(tag));
}

// Vælger de produkter, "Galleri"-blokken forudfyldes med ved automatisk
// blok-opbygning – kun blandt produkter med et rigtigt billede (samme regel
// som GalleryBlockControls bruger ved manuelt valg, så den automatiske
// starttilstand aldrig kan give et tomt src-attribut). Er mindst `count`
// produkter tagget som bestseller, bruges de (i den rækkefølge, de blev
// valgt); ellers bruges simpelthen de først valgte `count` produkter.
function pickGalleryProducts(products: ShopifyProduct[], count: number): ShopifyProduct[] {
  const withImages = products.filter((product) => product.hasImage && product.imageUrl);
  const bestSellers = withImages.filter(isBestSeller);
  if (bestSellers.length >= count) {
    return bestSellers.slice(0, count);
  }
  return withImages.slice(0, count);
}

export function createDefaultBlocks(
  result: GeneratedNewsletter,
  customerType: CustomerType,
  // De produkter, brugeren valgte på "Vælg produkter"-siden – bruges som
  // fallback for billede-blokken, hvis AI-svarets productId ikke kan slås op
  // (se nedenfor), OG afgør, om der automatisk indsættes en "Billede"- eller
  // "Galleri"-blok (se blockTypes herunder).
  selectedProducts: ShopifyProduct[],
  brandDefaults: BrandDefaults,
): NewsletterBlock[] {
  // Præcis ét valgt produkt: almindelig Billede-blok, som hidtil. Mere end
  // ét: en Galleri-blok på samme plads i stedet – galleriet er ikke beregnet
  // til at vise ALLE valgte produkter på én gang (ligesom Produktvisnings-
  // blokken heller ikke er begrænset, men et repræsentativt udsnit på 2-3),
  // kun et kurateret udsnit. Dette er kun den automatiske starttilstand;
  // brugeren kan altid erstatte den manuelt i Edit-mode bagefter.
  const imageBlockType: "billede" | "galleri" = selectedProducts.length > 1 ? "galleri" : "billede";
  const blockTypes: BlockType[] = [
    "header",
    "overskrift",
    "brodtekst",
    imageBlockType,
    "produktvisning",
    "skillelinje",
    "cta",
    "footer",
  ];
  const defaultFontFamily = resolveFontFamily(brandDefaults.primaryFont);

  return blockTypes.map((type) => {
    const block: NewsletterBlock = { id: type, type, hidden: false };
    // Starttilstand for ALLE rich-text-blokke (Overskrift/Brødtekst/CTA her)
    // er kundens egen primære farve/skrifttype – kun et udgangspunkt, ikke
    // en låsning; de fire farve-swatches/skrifttype-vælgeren i Edit-mode
    // overskriver blot dette som ethvert andet valg.
    if (RICH_TEXT_BLOCK_TYPES.includes(type)) {
      block.fontFamily = defaultFontFamily;
      block.textColor = brandDefaults.primaryColor;
    }
    if (type === "overskrift") block.content = result.heading;
    if (type === "brodtekst") {
      block.content = [greetingFor(customerType), result.bodyText, CLOSING_TEXT]
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");
    }
    if (type === "billede") {
      // Slå produktet op blandt de faktisk valgte produkter ud fra det
      // productId, AI'en pegede på – vi stoler ikke på, at Gemini har
      // kopieret imageUrl'en korrekt videre, kun på at productId
      // identificerer det rigtige produkt. Findes det ikke (fx tomt/forkert
      // productId), falder vi tilbage til det først valgte produkt, så
      // blokken stadig starter med et rigtigt billede.
      const matchedProduct =
        selectedProducts.find((product) => product.id === result.image.productId) ?? selectedProducts[0];
      if (matchedProduct) {
        block.imageUrl = matchedProduct.imageUrl;
        block.altText = matchedProduct.title;
      }
    }
    if (type === "galleri") {
      // 2 valgte produkter i alt: begge med i et 2-kolonne galleri. 3 eller
      // flere: kun et udsnit af 3 i et 3-kolonne galleri (se
      // pickGalleryProducts).
      const columns: GalleryColumns = selectedProducts.length === 2 ? 2 : 3;
      const galleryProducts = pickGalleryProducts(selectedProducts, columns);
      block.galleryProductIds = galleryProducts.map((product) => product.id);
      block.galleryColumns = columns;
    }
    if (type === "cta") {
      block.content = result.cta.text;
      block.ctaUrl = result.cta.url;
    }
    return block;
  });
}

export function duplicateBlock(block: NewsletterBlock): NewsletterBlock {
  return {
    ...block,
    id: `${block.type}-${crypto.randomUUID()}`,
  };
}

// Den del af en blok, der er tilbage, når "Gem som skabelon" har fjernet alt
// AI-genereret/produktspecifikt indhold – kun blok-type, synlighed og
// stylingvalg, der gælder UANSET hvilket konkret nyhedsbrev/produkter en
// senere bruger af skabelonen vælger. Bevidst ingen id (skabelonen er ikke
// bundet til de originale blok-instansers id'er) og ingen content/ctaUrl/
// productId/imageUrl/altText/galleryProductIds (alt sammen enten AI-tekst,
// et konkret link, eller et konkret produkt-/billedvalg).
export type TemplateBlock = Pick<
  NewsletterBlock,
  | "type"
  | "hidden"
  | "fontFamily"
  | "textColor"
  | "bgColor"
  | "alignment"
  | "size"
  | "ctaPadding"
  | "ctaBorderRadius"
  | "ctaStyle"
  | "galleryColumns"
>;

// Bygger den JSON-struktur, "Gem som skabelon" gemmer i Supabase, ud fra det
// NUVÆRENDE blocks-array – rækkefølgen er selve array-rækkefølgen, så
// createBlocksFromTemplate herunder kan genskabe præcis samme blok-opbygning
// og styling for et nyt nyhedsbrev.
export function buildTemplateBlockStructure(blocks: NewsletterBlock[]): TemplateBlock[] {
  return blocks.map((block) => ({
    type: block.type,
    hidden: block.hidden,
    fontFamily: block.fontFamily,
    textColor: block.textColor,
    bgColor: block.bgColor,
    alignment: block.alignment,
    size: block.size,
    ctaPadding: block.ctaPadding,
    ctaBorderRadius: block.ctaBorderRadius,
    ctaStyle: block.ctaStyle,
    galleryColumns: block.galleryColumns,
  }));
}

// Det omvendte af buildTemplateBlockStructure: genopbygger et fuldt
// blocks-array ud fra en gemt skabelons struktur/styling + et FRISKT
// AI-resultat og de PT. valgte produkter (ikke skabelonens oprindelige
// produktvalg – de er jo strippet væk, og pointen med en skabelon er netop
// at kunne genbruge den med et nyt produktvalg). Bruges af
// generate-newsletter/route.ts, når brugeren har valgt en skabelon i stedet
// for "Standard layout".
export function createBlocksFromTemplate(
  templateBlocks: TemplateBlock[],
  result: GeneratedNewsletter,
  customerType: CustomerType,
  selectedProducts: ShopifyProduct[],
  brandDefaults: BrandDefaults,
): NewsletterBlock[] {
  const defaultFontFamily = resolveFontFamily(brandDefaults.primaryFont);

  return templateBlocks.map((templateBlock) => {
    // Skabelonens EGEN gemte fontFamily/textColor vinder altid, hvis den er
    // sat – brand-defaults fylder kun hullet ud, hvis skabelonen aldrig fik
    // sat en eksplicit værdi for netop den blok (fx en skabelon gemt før
    // nogen rørte den globale farve/skrifttype-vælger).
    const block: NewsletterBlock = {
      id: `${templateBlock.type}-${crypto.randomUUID()}`,
      type: templateBlock.type,
      hidden: templateBlock.hidden,
      fontFamily: templateBlock.fontFamily,
      textColor: templateBlock.textColor,
      bgColor: templateBlock.bgColor,
      alignment: templateBlock.alignment,
      size: templateBlock.size,
      ctaPadding: templateBlock.ctaPadding,
      ctaBorderRadius: templateBlock.ctaBorderRadius,
      ctaStyle: templateBlock.ctaStyle,
    };
    if (RICH_TEXT_BLOCK_TYPES.includes(block.type)) {
      block.fontFamily = block.fontFamily ?? defaultFontFamily;
      block.textColor = block.textColor ?? brandDefaults.primaryColor;
    }

    if (block.type === "overskrift") block.content = result.heading;
    if (block.type === "brodtekst") {
      block.content = [greetingFor(customerType), result.bodyText, CLOSING_TEXT]
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");
    }
    // "billede" og "img" er samme visning/kontroller (se BlockContent i
    // EditorBlockList.tsx) – en skabelon kan i princippet indeholde begge,
    // hvis brugeren tilføjede en ekstra billedblok manuelt før den blev gemt.
    if (block.type === "billede" || block.type === "img") {
      const matchedProduct =
        selectedProducts.find((product) => product.id === result.image.productId) ?? selectedProducts[0];
      if (matchedProduct) {
        block.imageUrl = matchedProduct.imageUrl;
        block.altText = matchedProduct.title;
      }
    }
    if (block.type === "produkt") {
      block.productId = selectedProducts[0]?.id;
    }
    if (block.type === "galleri") {
      const columns = templateBlock.galleryColumns ?? 2;
      const galleryProducts = pickGalleryProducts(selectedProducts, columns);
      block.galleryProductIds = galleryProducts.map((product) => product.id);
      block.galleryColumns = columns;
    }
    if (block.type === "cta") {
      block.content = result.cta.text;
      block.ctaUrl = result.cta.url;
    }
    // "tekst" er frit indtastet af brugeren og derfor ikke AI-genereret – der
    // er intet oprindeligt indhold at genskabe (det er strippet med vilje),
    // så blokken starter med samme pladsholdertekst som når den tilføjes
    // manuelt via "+ Tilføj blok" (se createNewBlock).
    if (block.type === "tekst") {
      block.content = "Ny tekstblok – redigér indholdet her";
    }

    return block;
  });
}

// De typer, der kan tilføjes via "+ Tilføj blok"-menuen.
export type AddableBlockKind = "tekst" | "billede" | "produkt" | "knap" | "skillelinje" | "galleri";

export const ADDABLE_BLOCK_KINDS: AddableBlockKind[] = [
  "tekst",
  "billede",
  "produkt",
  "knap",
  "skillelinje",
  "galleri",
];

export function createNewBlock(kind: AddableBlockKind, defaultProductId?: string): NewsletterBlock {
  const id = `${kind}-${crypto.randomUUID()}`;

  switch (kind) {
    case "tekst":
      return { id, type: "tekst", hidden: false, content: "Ny tekstblok – redigér indholdet her" };
    case "billede":
      return { id, type: "img", hidden: false };
    case "produkt":
      return { id, type: "produkt", hidden: false, productId: defaultProductId };
    case "knap":
      return { id, type: "cta", hidden: false, content: "Se sortimentet", ctaUrl: "" };
    case "skillelinje":
      return { id, type: "skillelinje", hidden: false };
    case "galleri":
      // Tom som udgangspunkt – brugeren vælger selv 2-3 produkter i
      // GalleryBlockControls, jf. opgavebeskrivelsen ("default til INGEN
      // valgt", ligesom det øvrige billede-flow ikke gætter for brugeren).
      return { id, type: "galleri", hidden: false, galleryProductIds: [], galleryColumns: 2 };
  }
}
