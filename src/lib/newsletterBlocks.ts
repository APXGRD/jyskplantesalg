// Fælles blok-model for nyhedsbrevet. Bruges af både Edit-mode (drag-and-drop,
// duplikér/skjul/slet/tilføj) og Preview-visningen samt "Kopiér nyhedsbrev", så
// alle tre altid viser/eksporterer nøjagtig det samme sæt blokke, i samme
// rækkefølge, med samme synlighed og samme indhold.

import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import type { CustomerType } from "@/lib/format";
import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";

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
  | "produkt";

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
}

// De blok-typer, hvis indhold redigeres som fri tekst via TextBlockEditor
// (Tiptap) – dem, den globale skrifttype-vælger i Edit-mode sætter på én
// gang.
export const RICH_TEXT_BLOCK_TYPES: BlockType[] = ["overskrift", "brodtekst", "tekst", "cta"];

const DEFAULT_BLOCK_TYPES: BlockType[] = [
  "header",
  "overskrift",
  "brodtekst",
  "billede",
  "produktvisning",
  "skillelinje",
  "cta",
  "footer",
];

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

export function createDefaultBlocks(
  result: GeneratedNewsletter,
  customerType: CustomerType,
  // De produkter, brugeren valgte på "Vælg produkter"-siden – bruges kun som
  // fallback for billede-blokken, hvis AI-svarets productId ikke kan slås op
  // (se nedenfor).
  selectedProducts: ShopifyProduct[],
): NewsletterBlock[] {
  return DEFAULT_BLOCK_TYPES.map((type) => {
    const block: NewsletterBlock = { id: type, type, hidden: false };
    if (type === "overskrift") block.content = result.heading;
    if (type === "brodtekst") {
      block.content = [greetingFor(customerType), result.bodyText, CLOSING_TEXT]
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");
    }
    if (type === "billede") {
      // Slå produktet op i den fulde mockShopData ud fra det productId, AI'en
      // pegede på – vi stoler ikke på, at Gemini har kopieret imageUrl'en
      // korrekt videre, kun på at productId identificerer det rigtige produkt.
      // Findes det ikke (fx tomt/forkert productId), falder vi tilbage til det
      // først valgte produkt, så blokken stadig starter med et rigtigt billede.
      const matchedProduct =
        mockShopData.products.find((product) => product.id === result.image.productId) ??
        selectedProducts[0];
      if (matchedProduct) {
        block.imageUrl = matchedProduct.imageUrl;
        block.altText = matchedProduct.title;
      }
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

// De fem typer, der kan tilføjes via "+ Tilføj blok"-menuen.
export type AddableBlockKind = "tekst" | "billede" | "produkt" | "knap" | "skillelinje";

export const ADDABLE_BLOCK_KINDS: AddableBlockKind[] = [
  "tekst",
  "billede",
  "produkt",
  "knap",
  "skillelinje",
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
  }
}
