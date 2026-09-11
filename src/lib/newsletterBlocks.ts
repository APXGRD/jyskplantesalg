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

// "img" og "galleri" er BEVIDST stadig anerkendte typer her – IKKE fordi nye
// blokke af disse typer kan opstå længere (se ADDABLE_BLOCK_KINDS/
// createNewBlock/createDefaultBlocks/createBlocksFromTemplate, som alle nu
// udelukkende producerer "billede"), men så allerede GEMTE nyhedsbrev-udkast
// og skabeloner (localStorage/Supabase) fra FØR konsolideringen til én
// samlet Billede-/Galleri-blok stadig indlæses og vises korrekt. Selve
// render-/kontrol-logikken (NewsletterCard.tsx, newsletterExport.ts,
// EditorBlockList.tsx) behandler alle tre typer identisk ud fra block.
// galleryColumns (se MediaLayout herunder) – ikke ud fra selve type-strengen.
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

// Produktvisnings-blokkens "Tæthed"-valg – styrer den lodrette afstand
// mellem hvert produkt i listen (både Preview og den kopierede HTML bruger
// samme PRODUCT_ROW_PADDING_PX, så de altid matcher). Bevidst kun to valg
// (ikke tre som CTA-paddingen), jf. opgavebeskrivelsen.
export type ProductListDensity = "kompakt" | "normal";

export const PRODUCT_ROW_PADDING_PX: Record<ProductListDensity, number> = {
  kompakt: 6,
  normal: 12,
};

// "udfyldt" (standard) = baggrundsfarve fra bgColor. "kontur" = ingen
// baggrund, kun en 2px kant og tekst i bgColor's farve – samme farvefelt
// genbruges bare med en anden visuel betydning afhængig af stilen.
export type CtaStyle = "udfyldt" | "kontur";

// Den samlede Billede-/Galleri-blok har FIRE kuraterede layout-valg – bevidst
// ingen fri indtastning af antal, jf. opgavebeskrivelsen. "1" er det
// oprindelige enkelt-billede-layout (upload ELLER søgbart produktvalg,
// justering, størrelse); "2"/"3"/"6" er det oprindelige galleri-layout (kun
// søgbart produktvalg, fast kolonnebredde). "6" er IKKE 6 kolonner i én
// række, men "6 billeder" – 2 rækker × 3 kolonner (se GALLERY_ROW_SIZE_PX
// og rendering i NewsletterCard.tsx/newsletterExport.ts). GalleryColumns
// holdes som en selvstændig type (i stedet for at inline'e 2|3|6 igen), fordi
// GALLERY_IMAGE_WIDTH_PX/GALLERY_ROW_SIZE nedenfor KUN giver mening for
// flerbilled-layoutet – layout "1" render'es i stedet via IMAGE_SIZE_PX/
// alignment, samme som den oprindelige Billede-blok altid har gjort.
export type GalleryColumns = 2 | 3 | 6;

// Blokkens fulde layout-valg: "1" (enkelt billede) eller et af de tre
// galleri-antal. Feltnavnet på selve blokken (galleryColumns, se
// NewsletterBlock herunder) er BEVIDST ikke omdøbt til "mediaLayout", selvom
// det nu også dækker layout "1" – det minimerer risikoen for allerede gemte
// nyhedsbrev-udkast/skabeloner (localStorage/Supabase), der refererer feltet
// ved dette navn.
export type MediaLayout = 1 | GalleryColumns;

// De fire layout-valg i den rækkefølge, de skal vises i Edit-mode.
export const MEDIA_LAYOUT_OPTIONS: MediaLayout[] = [1, 2, 3, 6];

// "1" (eller slet ingen værdi, dvs. et gammelt gemt "billede"/"img"-udkast
// fra FØR konsolideringen) betyder enkelt-billede-layout; 2/3/6 betyder
// galleri-layout. Bruges i NewsletterCard.tsx/newsletterExport.ts/
// EditorBlockList.tsx til at afgøre, hvilket af de to render-/kontrol-spor en
// given blok skal bruge, UDEN at skulle skelne på selve type-strengen
// ("billede" vs. det legacy "img"/"galleri").
export function isGalleryLayout(columns: MediaLayout | undefined): columns is GalleryColumns {
  return (columns ?? 1) > 1;
}

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
  // AI'ens OPRINDELIGT genererede knap-tekst, uændret – adskilt fra content
  // ovenfor (som er den FAKTISK viste tekst, og som applyCtaLinkUpdate i
  // EditorBlockList.tsx kan overskrive med en fast ental-tekst, når CTA-
  // unionen er indsnævret til ét produkt). Bruges til at gendanne den
  // naturlige, varierede flertalsformulering, når unionen igen omfatter mere
  // end ét produkt, i stedet for at skulle bede AI'en generere den påny.
  // Undefined for manuelt tilføjede knap-blokke (se createNewBlock) – der er
  // ingen AI-tekst at vende tilbage til for dem.
  originalCtaText?: string;
  // Kun relevant for "produkt"-blokken (enkelt-produkt-visning).
  productId?: string;
  // Kun relevant for den samlede Billede-/Galleri-blok ("billede", og de
  // legacy-typer "img"/"galleri") ved layout "1" (se galleryColumns
  // herunder) – enten en base64 data-URI fra "Udskift billede"-upload
  // (client-side preview via FileReader, se ImageBlockControls.tsx) ELLER
  // sat automatisk, når brugeren i stedet vælger ét produkt via den
  // søgbare produktvælger (se galleryProductIds). Uden imageUrl falder
  // blokken tilbage til sin eksisterende pladsholder-visning.
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
  // Kun relevant for den samlede Billede-/Galleri-blok. galleryColumns er nu
  // blokkens FULDE layout-valg (se MediaLayout ovenfor) – "1" (eller
  // undefined, for gamle "billede"/"img"-udkast fra før konsolideringen)
  // betyder enkelt-billede-layout (imageUrl/altText/alignment/size, se
  // ovenfor); 2/3/6 betyder galleri-layout. galleryProductIds er, ved BEGGE
  // layout-typer, de(t) valgte produkts/produkters id'er via den søgbare
  // produktvælger (blandt de produkter, der allerede er valgt på "Vælg
  // produkter"-siden) – ved layout "1" højst ét id (sat sammen med
  // imageUrl/altText, se SearchableProductChecklist-brugen i
  // EditorBlockList.tsx); ved layout 2/3/6 op til `galleryColumns` id'er.
  // Antallet af id'er holdes altid inden for galleryColumns af
  // GalleryBlockControls, så rendering aldrig skal håndtere flere billeder,
  // end layoutet reelt har plads til.
  galleryProductIds?: string[];
  galleryColumns?: MediaLayout;
  // Kun relevant for "produktvisning"-blokken. productDisplayIds er
  // brugerens egen, frie multi-select blandt de tilgængelige produkter
  // (INGEN øvre grænse, til forskel fra galleryProductIds) – undefined
  // betyder "vis alle tilgængelige produkter" (den oprindelige, uændrede
  // opførsel, før dette valg fandtes). productBorderRadius/productDensity er
  // rene stilvalg (farven forbliver bevidst fast sort, se
  // NewsletterCard.tsx/newsletterExport.ts) – samme CtaBorderRadius-type som
  // CTA-knappen allerede bruger, genbrugt her i stedet for en ny type.
  productDisplayIds?: string[];
  productBorderRadius?: CtaBorderRadius;
  productDensity?: ProductListDensity;
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

// Bygger Brødtekst-blokkens FULDE HTML-indhold (hilsen + selve AI-teksten,
// hver i sit eget <p>) – PRÆCIS samme formatering, uanset om den bruges ved
// selve genereringen (createDefaultBlocks/createBlocksFromTemplate herunder)
// eller ved en efterfølgende "Regenerér tekst"-handling i Edit-mode (se
// EditorBlockList.tsx), som KUN opdaterer Overskrift-/Brødtekst-indholdet
// uden at røre blok-struktur/styling. Eksporteret, så begge steder deler
// nøjagtig samme funktion i stedet for at duplikere escapeHtml/greetingFor-
// logikken.
export function buildBodyTextHtml(customerType: CustomerType, bodyText: string): string {
  return [greetingFor(customerType), bodyText].map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

// Bruges kun til at PRIORITERE blandt de allerede valgte produkter, når
// galleriet forudfyldes automatisk (se pickGalleryProducts) – ShopifyProduct
// har intet dedikeret isBestSeller-felt, så det nærmeste tilsvarende er et
// tag, der nævner "bestseller" (fx sat manuelt i Shopify-admin). Findes et
// sådant tag ikke på nok produkter, falder forudfyldningen roligt tilbage
// til de først valgte produkter i stedet for at fejle eller vise intet.
// Eksporteret, så generate-newsletter/route.ts kan genbruge PRÆCIS samme
// bestseller-detektion til at vælge ét repræsentativt produkt ved
// emne-søgning (se resolveTopicRepresentativeProduct), i stedet for at
// duplikere logikken.
export function isBestSeller(product: ShopifyProduct): boolean {
  return product.tags.some((tag) => /best[\s-]?seller/i.test(tag));
}

// Vælger de produkter, "Galleri"-blokken forudfyldes med ved automatisk
// blok-opbygning – kun blandt produkter med et rigtigt billede (samme regel
// som GalleryBlockControls bruger ved manuelt valg, så den automatiske
// starttilstand aldrig kan give et tomt src-attribut). Er mindst `count`
// produkter tagget som bestseller, bruges de (i den rækkefølge, de blev
// valgt); ellers bruges simpelthen de først valgte `count` produkter.
// Eksporteret, så EditorBlockList.tsx kan genbruge samme kuraterings-logik,
// når en billede-blok fra en emne-søgning manuelt konverteres til et galleri.
export function pickGalleryProducts(products: ShopifyProduct[], count: number): ShopifyProduct[] {
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
  // De "seed"-produkter, genereringen skal bygges ud fra (fra
  // generate-newsletter/route.ts: de FØRSTE N af det fulde matchede sæt,
  // N = "Maks. antal produkter"-grænsen, se seedProducts der) – bruges som
  // fallback for billede-blokken, hvis AI-svarets productId ikke kan slås op
  // (se nedenfor), afgør om der automatisk indsættes en "Billede"- eller
  // "Galleri"-blok (se blockTypes herunder), OG sætter produktvisnings-
  // blokkens INITIALE productDisplayIds (se type==="produktvisning"
  // herunder). Dette er en AFGRÆNSET seed-pulje, IKKE det fulde matchede
  // sæt – Edit-mode's produktvælgere henter i stedet fra HELE puljen (se
  // topicMatchedProductIds i NewsletterContext.tsx), uafhængigt af denne.
  selectedProducts: ShopifyProduct[],
  brandDefaults: BrandDefaults,
): NewsletterBlock[] {
  // Én samlet Billede-/Galleri-blok, uanset antal valgte (seed-)produkter –
  // kun dens layout-valg (galleryColumns, se herunder) afgør, om den starter
  // som enkelt-billede (præcis ét seed-produkt) eller galleri (mere end ét).
  // Galleriet er ikke beregnet til at vise ALLE seed-produkter på én gang
  // (kun et kurateret udsnit på 2-3, se pickGalleryProducts) – dette er kun
  // den automatiske starttilstand; brugeren kan altid ændre layoutet
  // manuelt i Edit-mode bagefter, med adgang til HELE det matchede sæt
  // (ikke kun seed-puljen), se produktvisning-håndteringen herunder.
  const blockTypes: BlockType[] = [
    "header",
    "overskrift",
    "brodtekst",
    "billede",
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
      block.content = buildBodyTextHtml(customerType, result.bodyText);
    }
    if (type === "billede") {
      if (selectedProducts.length > 1) {
        // 2 valgte produkter i alt: begge med i et 2-kolonne galleri. 3
        // eller flere: kun et udsnit af 3 i et 3-kolonne galleri (se
        // pickGalleryProducts).
        const columns: GalleryColumns = selectedProducts.length === 2 ? 2 : 3;
        const galleryProducts = pickGalleryProducts(selectedProducts, columns);
        block.galleryProductIds = galleryProducts.map((product) => product.id);
        block.galleryColumns = columns;
      } else {
        // Slå produktet op blandt de faktisk valgte produkter ud fra det
        // productId, AI'en pegede på – vi stoler ikke på, at Gemini har
        // kopieret imageUrl'en korrekt videre, kun på at productId
        // identificerer det rigtige produkt. Findes det ikke (fx tomt/
        // forkert productId), falder vi tilbage til det først valgte
        // produkt, så blokken stadig starter med et rigtigt billede.
        const matchedProduct =
          selectedProducts.find((product) => product.id === result.image.productId) ?? selectedProducts[0];
        if (matchedProduct) {
          block.imageUrl = matchedProduct.imageUrl;
          block.altText = matchedProduct.title;
        }
        block.galleryColumns = 1;
      }
    }
    if (type === "produktvisning") {
      // Sættes EKSPLICIT til seed-puljen (IKKE ladt undefined/"vis alle") –
      // ellers ville blokken automatisk vise HELE det matchede sæt (se
      // productDisplayIds' doc-kommentar i NewsletterBlock ovenfor), som kan
      // være langt større end "Maks. antal produkter"-grænsen tilsiger.
      // Brugeren kan altid udvide/indsnævre valget igen i Edit-mode – det
      // fulde sæt er fortsat tilgængeligt der (se topicMatchedProductIds).
      block.productDisplayIds = selectedProducts.map((product) => product.id);
    }
    if (type === "cta") {
      block.content = result.cta.text;
      block.originalCtaText = result.cta.text;
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
// originalCtaText/productId/imageUrl/altText/galleryProductIds/
// productDisplayIds (alt sammen enten AI-tekst, et konkret link, eller et
// konkret produkt-/billedvalg).
// productBorderRadius/productDensity ER med – rene stilvalg, samme princip
// som ctaBorderRadius/ctaPadding/galleryColumns.
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
  | "productBorderRadius"
  | "productDensity"
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
    // Produktvisning har ingen farve-vælger – altid fast sort, jf.
    // NewsletterCard.tsx/newsletterExport.ts. Evt. tilbageværende textColor
    // fra dengang blokken kortvarigt HAVDE en farve-vælger skal ikke leve
    // videre i nye skabeloner.
    textColor: block.type === "produktvisning" ? undefined : block.textColor,
    bgColor: block.bgColor,
    alignment: block.alignment,
    size: block.size,
    ctaPadding: block.ctaPadding,
    ctaBorderRadius: block.ctaBorderRadius,
    ctaStyle: block.ctaStyle,
    galleryColumns: block.galleryColumns,
    productBorderRadius: block.productBorderRadius,
    productDensity: block.productDensity,
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
  // Samme "seed"-pulje-begreb som createDefaultBlocks ovenfor (de FØRSTE N
  // af det fulde matchede sæt, se generate-newsletter/route.ts) – IKKE det
  // fulde matchede sæt. Bruges her til billede-/galleri-layoutet OG til
  // produktvisnings-blokkens initiale productDisplayIds, se herunder.
  selectedProducts: ShopifyProduct[],
  brandDefaults: BrandDefaults,
): NewsletterBlock[] {
  const defaultFontFamily = resolveFontFamily(brandDefaults.primaryFont);

  return templateBlocks.map((templateBlock) => {
    // Ældre skabeloner (gemt før Billede/Galleri blev konsolideret til én
    // blok-type) kan stadig have type "img" eller "galleri" gemt – de
    // normaliseres her til "billede", ligesom ALT nyt indhold fra nu af kun
    // producerer "billede" (se ADDABLE_BLOCK_KINDS/createNewBlock
    // nedenfor). Selve layout-valget (enkelt billede vs. galleri) afgøres
    // udelukkende af templateBlock.galleryColumns herunder, ikke af denne
    // oprindelige type-streng.
    const normalizedType: BlockType =
      templateBlock.type === "img" || templateBlock.type === "galleri" ? "billede" : templateBlock.type;

    // Skabelonens EGEN gemte fontFamily/textColor vinder altid, hvis den er
    // sat – brand-defaults fylder kun hullet ud, hvis skabelonen aldrig fik
    // sat en eksplicit værdi for netop den blok (fx en skabelon gemt før
    // nogen rørte den globale farve/skrifttype-vælger).
    const block: NewsletterBlock = {
      id: `${normalizedType}-${crypto.randomUUID()}`,
      type: normalizedType,
      hidden: templateBlock.hidden,
      fontFamily: templateBlock.fontFamily,
      // Produktvisning har ingen farve-vælger – ignorér evt. gammel gemt
      // textColor fra en skabelon, i stedet for at genoplive den her.
      textColor: templateBlock.type === "produktvisning" ? undefined : templateBlock.textColor,
      bgColor: templateBlock.bgColor,
      alignment: templateBlock.alignment,
      size: templateBlock.size,
      ctaPadding: templateBlock.ctaPadding,
      ctaBorderRadius: templateBlock.ctaBorderRadius,
      ctaStyle: templateBlock.ctaStyle,
      productBorderRadius: templateBlock.productBorderRadius,
      productDensity: templateBlock.productDensity,
    };
    if (RICH_TEXT_BLOCK_TYPES.includes(block.type)) {
      block.fontFamily = block.fontFamily ?? defaultFontFamily;
      block.textColor = block.textColor ?? brandDefaults.primaryColor;
    }

    if (block.type === "overskrift") block.content = result.heading;
    if (block.type === "brodtekst") {
      block.content = buildBodyTextHtml(customerType, result.bodyText);
    }
    // Den samlede Billede-/Galleri-blok (se normalizedType ovenfor) – samme
    // layout-regel som createDefaultBlocks: galleryColumns > 1 betyder
    // galleri-layout (kurateret produktudsnit), ellers enkelt-billede-layout
    // (samme matchedProduct-fallback som hidtil). Ældre skabeloner uden
    // gemt galleryColumns (fra dengang "billede"/"img" aldrig havde feltet)
    // falder korrekt tilbage til layout "1".
    if (normalizedType === "billede") {
      const columns: MediaLayout = templateBlock.galleryColumns ?? 1;
      if (isGalleryLayout(columns)) {
        const galleryProducts = pickGalleryProducts(selectedProducts, columns);
        block.galleryProductIds = galleryProducts.map((product) => product.id);
        block.galleryColumns = columns;
      } else {
        const matchedProduct =
          selectedProducts.find((product) => product.id === result.image.productId) ?? selectedProducts[0];
        if (matchedProduct) {
          block.imageUrl = matchedProduct.imageUrl;
          block.altText = matchedProduct.title;
        }
        block.galleryColumns = 1;
      }
    }
    if (block.type === "produkt") {
      block.productId = selectedProducts[0]?.id;
    }
    if (block.type === "produktvisning") {
      // Samme begrundelse som createDefaultBlocks: sættes EKSPLICIT til
      // seed-puljen, i stedet for at lade den stå undefined ("vis alle"),
      // som ellers ville ignorere "Maks. antal produkter"-grænsen helt.
      block.productDisplayIds = selectedProducts.map((product) => product.id);
    }
    if (block.type === "cta") {
      block.content = result.cta.text;
      block.originalCtaText = result.cta.text;
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

// De typer, der kan tilføjes via "+ Tilføj blok"-menuen. "billede" og
// "galleri" er BEVIDST slået sammen til ét "billede"-valg ("Billede/
// Galleri") – layout-valget (1/2/3/6, se MediaLayout) vælges bagefter inde i
// selve blokken, ikke i denne menu.
export type AddableBlockKind = "tekst" | "billede" | "produkt" | "knap" | "skillelinje";

export const ADDABLE_BLOCK_KINDS: AddableBlockKind[] = ["tekst", "billede", "produkt", "knap", "skillelinje"];

export function createNewBlock(kind: AddableBlockKind, defaultProductId?: string): NewsletterBlock {
  const id = `${kind}-${crypto.randomUUID()}`;

  switch (kind) {
    case "tekst":
      return { id, type: "tekst", hidden: false, content: "Ny tekstblok – redigér indholdet her" };
    case "billede":
      // Default til layout "1 billede", tomt – brugeren vælger selv upload
      // eller søgbart produktvalg (ImageBlockControls), jf.
      // opgavebeskrivelsen ("default til INGEN valgt", ligesom det øvrige
      // billede-flow ikke gætter for brugeren).
      return { id, type: "billede", hidden: false, galleryColumns: 1 };
    case "produkt":
      return { id, type: "produkt", hidden: false, productId: defaultProductId };
    case "knap":
      return { id, type: "cta", hidden: false, content: "Se sortimentet", ctaUrl: "" };
    case "skillelinje":
      return { id, type: "skillelinje", hidden: false };
  }
}
