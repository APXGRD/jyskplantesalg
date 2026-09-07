// Fælles blok-rækkefølge for nyhedsbrevet. Bruges af både Edit-mode
// (drag-and-drop-listen) og Preview-visningen, så en omarrangering i den ene
// visning med det samme afspejles i den anden.

export type BlockId =
  | "header"
  | "overskrift"
  | "brodtekst"
  | "billede"
  | "produktvisning"
  | "skillelinje"
  | "cta"
  | "footer";

export const DEFAULT_BLOCK_ORDER: BlockId[] = [
  "header",
  "overskrift",
  "brodtekst",
  "billede",
  "produktvisning",
  "skillelinje",
  "cta",
  "footer",
];
