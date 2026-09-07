// Fælles blok-model for nyhedsbrevet. Bruges af både Edit-mode (drag-and-drop,
// duplikér/skjul/slet/tilføj) og Preview-visningen samt "Kopiér nyhedsbrev", så
// alle tre altid viser/eksporterer nøjagtig det samme sæt blokke, i samme
// rækkefølge, med samme synlighed og samme indhold.

import type { GeneratedNewsletter } from "@/context/NewsletterContext";

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
}

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

export function createDefaultBlocks(result: GeneratedNewsletter): NewsletterBlock[] {
  return DEFAULT_BLOCK_TYPES.map((type) => {
    const block: NewsletterBlock = { id: type, type, hidden: false };
    if (type === "overskrift") block.content = result.heading;
    if (type === "brodtekst") block.content = result.bodyText;
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
