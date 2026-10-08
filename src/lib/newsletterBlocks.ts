// Fælles blok-model for nyhedsbrevet. Bruges af både Edit-mode (drag-and-drop,
// duplikér/skjul/slet/tilføj) og Preview-visningen samt "Kopiér nyhedsbrev", så
// alle tre altid viser/eksporterer nøjagtig det samme sæt blokke, i samme
// rækkefølge, med samme synlighed og samme indhold.

import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
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
  | "skillelinje"
  | "cta"
  | "footer"
  // Typer der (kun) kan tilføjes via "+ Tilføj blok":
  | "tekst"
  | "img"
  | "produkt"
  | "galleri"
  // Selvstændig billedblok: egne uploadede billeder (INTET med produkterne at
  // gøre) vist som masonry-gitter – se MasonryImage/buildMasonryColumns.
  | "billedeblok"
  // Links til virksomhedens sociale medier (Facebook, Instagram …) – se
  // SOCIAL_PLATFORMS/getSocialLinks.
  | "socials";

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

// Billede-/Galleri-blokkens "Tæthed"-valg – styrer luften i hvert
// produktkort og mellem linjerne i tekstlisten (både Preview og den kopierede HTML bruger
// samme PRODUCT_ROW_PADDING_PX, så de altid matcher). Bevidst kun to valg
// (ikke tre som CTA-paddingen), jf. opgavebeskrivelsen.
export type ProductListDensity = "kompakt" | "normal";

export const PRODUCT_ROW_PADDING_PX: Record<ProductListDensity, number> = {
  kompakt: 6,
  normal: 12,
};

// Billede-/Galleri-blokkens kant-form anvendt på HVERT produktkort. Samme tre valg
// som CTA-knappen, men "pille" er her en kraftig afrunding i stedet for
// 999px – et højt kort med 999px bliver ellers en oval, der skærer billedet af.
export const PRODUCT_CARD_RADIUS_PX: Record<CtaBorderRadius, number> = {
  skarp: 0,
  afrundet: 8,
  pille: 24,
};

// Mellemrum mellem produktkortene (både vandret og lodret).
export const PRODUCT_CARD_GAP_PX = 13;

// "udfyldt" (standard) = baggrundsfarve fra bgColor. "kontur" = ingen
// baggrund, kun en 2px kant og tekst i bgColor's farve – samme farvefelt
// genbruges bare med en anden visuel betydning afhængig af stilen.
export type CtaStyle = "udfyldt" | "kontur";

// Den samlede Billede-/Galleri-blok viser 1-6 billeder – bevidst ingen fri
// indtastning af antal. "1" er enkelt-billede-layoutet (upload ELLER søgbart
// produktvalg, justering, størrelse); 2-6 er galleri-layoutet (billedpladser
// med produkt eller upload), hvis fordeling på rækker styres af
// NewsletterBlock.galleryArrangement (se getMediaRowSize). GalleryColumns
// holdes som en selvstændig type, fordi række-/kortbredde-beregningen KUN
// giver mening for flerbilled-layoutet – layout "1" render'es i stedet via
// SINGLE_CARD_WIDTH_PX/alignment.
export type GalleryColumns = 2 | 3 | 4 | 5 | 6;

// Blokkens antal billeder: "1" (enkelt billede) eller et galleri-antal.
// Feltnavnet på selve blokken (galleryColumns, se NewsletterBlock herunder)
// er BEVIDST ikke omdøbt (fx til "mediaCount"), selvom det nu betyder
// ANTAL billeder, ikke kolonner – det bevarer allerede gemte nyhedsbrev-
// udkast/skabeloner (localStorage/Supabase), der refererer feltet ved dette
// navn (et gammelt "6" betyder stadig 6 billeder i 2 rækker à 3).
export type MediaLayout = 1 | GalleryColumns;

// Antals-valgene i den rækkefølge, de skal vises i Edit-mode.
export const MEDIA_LAYOUT_OPTIONS: MediaLayout[] = [1, 2, 3, 4, 5, 6];

// Hvordan et galleri fordeles: "row" = alle billeder side om side på ÉN
// række; "grid" = fordelt på flere rækker (se getMediaRowSize).
export type GalleryArrangement = "row" | "grid";

// Standard, når blokken ikke selv har et valg: op til 3 billeder står på én
// række, 4-6 fordeles på to rækker – samme opførsel som før valget fandtes
// (2 og 3 på én række, 6 som 3 + 3).
export function getGalleryArrangement(
  block: Pick<NewsletterBlock, "galleryColumns" | "galleryArrangement">,
): GalleryArrangement {
  return block.galleryArrangement ?? ((block.galleryColumns ?? 1) <= 3 ? "row" : "grid");
}

// Billeder pr. række. Har brugeren valgt et antal pr. række (galleryPerRow,
// fx 2 ved 6 billeder = 2 + 2 + 2), bruges det.
// Ellers den ældre placering: "row" = alle på én række; "grid" = fordelt på
// (typisk) to rækker, med den fyldigste række først – 2 → 1 + 1 (under
// hinanden), 3 → 2 + 1, 4 → 2 + 2, 5 → 3 + 2, 6 → 3 + 3.
export function getMediaRowSize(
  block: Pick<NewsletterBlock, "galleryColumns" | "galleryArrangement" | "galleryPerRow">,
): number {
  const count = block.galleryColumns ?? 1;
  if (count <= 1) return 1;
  // Et valg, der ikke passer til det nuværende antal (fx "3 pr. række" valgt
  // ved 6 billeder, hvorefter antallet er ændret til 4), ignoreres – så
  // falder placeringen tilbage til standarden herunder.
  if (block.galleryPerRow && getMediaRowOptions(count).includes(block.galleryPerRow)) return block.galleryPerRow;
  return getGalleryArrangement(block) === "row" ? count : Math.ceil(count / 2);
}

// "Placering"-valgene (antal billeder pr. række) for et givent antal
// billeder: alle på én række, fordelt på to rækker, og 2 pr. række – fx
// 6 → [6, 3, 2] (6 / 3 + 3 / 2 + 2 + 2), 5 → [5, 3, 2], 4 → [4, 2],
// 3 → [3, 2], 2 → [2, 1] (side om side / under hinanden).
export function getMediaRowOptions(count: number): number[] {
  if (count <= 1) return [1];
  const options = [count, Math.ceil(count / 2), 2];
  if (count === 2) options.push(1);
  return [...new Set(options)].sort((a, b) => b - a);
}

// Nyhedsbrevets indholdsbredde i den kopierede HTML: 600px - 2×1px ydre ramme
// - 2×32px padding. En række kort (inkl. kant) + mellemrum må ikke overskride
// den – ellers klemmer mail-klienten kortene, så de ikke længere er lige store.
export const MEDIA_CONTENT_WIDTH_PX = 534;
// Galleri-kort bliver aldrig bredere end dette (fx 2 billeder under hinanden)
// – ellers ville et enkelt kort fylde hele bredden som et kæmpe kvadrat.
const MAX_GALLERY_CARD_WIDTH_PX = 260;

// Galleri-kortenes bredde (INKL. 1px kant i hver side) ved et givent antal
// kort pr. række: så bredt som muligt, uden at rækken overskrider
// MEDIA_CONTENT_WIDTH_PX. Fx 3 pr. række → 169px (3×169 + 2×13 = 533).
export function getGalleryCardWidth(perRow: number): number {
  const available = MEDIA_CONTENT_WIDTH_PX - (perRow - 1) * PRODUCT_CARD_GAP_PX;
  return Math.min(Math.floor(available / perRow), MAX_GALLERY_CARD_WIDTH_PX);
}

// Smalle kort (5-6 på én række, under 120px) får mindre tekst og luft, så
// produktnavnet ikke brydes op i et ord pr. linje.
export function isCompactCardWidth(cardWidth: number): boolean {
  return cardWidth < 120;
}

// "1" (eller slet ingen værdi, dvs. et gammelt gemt "billede"/"img"-udkast
// fra FØR konsolideringen) betyder enkelt-billede-layout; 2-6 betyder
// galleri-layout. Bruges i NewsletterCard.tsx/newsletterExport.ts/
// EditorBlockList.tsx til at afgøre, hvilket af de to render-/kontrol-spor en
// given blok skal bruge, UDEN at skulle skelne på selve type-strengen
// ("billede" vs. det legacy "img"/"galleri").
export function isGalleryLayout(columns: MediaLayout | undefined): columns is GalleryColumns {
  return (columns ?? 1) > 1;
}

// Én billedplads i et galleri, i layout-rækkefølge.
export type GallerySlot =
  | { index: number; kind: "upload"; upload: GalleryUpload }
  | { index: number; kind: "product"; productId?: string };

// Galleriets pladser i rækkefølge: upload-pladser står fast på deres plads,
// og de øvrige (produkt-)pladser fyldes i rækkefølge med galleryProductIds.
// Den ENESTE sandhed om "hvad står på plads N" – bruges af både kontrol-
// panelet (GalleryBlockControls), Preview (NewsletterCard) og den kopierede
// HTML/tekst (newsletterExport), så de aldrig kan blive uenige.
export function getGallerySlots(
  block: Pick<NewsletterBlock, "galleryColumns" | "galleryProductIds" | "galleryUploads">,
): GallerySlot[] {
  if (!isGalleryLayout(block.galleryColumns)) return [];
  const uploads = block.galleryUploads ?? [];
  const productQueue = [...(block.galleryProductIds ?? [])];
  return Array.from({ length: block.galleryColumns }, (_, index): GallerySlot => {
    const upload = uploads[index];
    if (upload) return { index, kind: "upload", upload };
    return { index, kind: "product", productId: productQueue.shift() };
  });
}

// Antal pladser, der fyldes med produkter (= layoutets antal minus upload-
// pladser) – loftet for, hvor mange produkter produktvælgeren må vælge.
export function getGalleryProductSlotCount(
  block: Pick<NewsletterBlock, "galleryColumns" | "galleryProductIds" | "galleryUploads">,
): number {
  return getGallerySlots(block).filter((slot) => slot.kind === "product").length;
}

// Kortbredde ved "1 billede" pr. størrelsesvalg (Lille/Mellem/Fuld bredde) –
// "fuld" er hele indholdsbredden (MEDIA_CONTENT_WIDTH_PX).
export const SINGLE_CARD_WIDTH_PX: Record<ImageSize, number> = {
  lille: 200,
  mellem: 400,
  fuld: 534,
};

// Produktet bag et "1 billede"-layout – det produkt, der er valgt via den
// søgbare vælger (galleryProductIds[0]), men KUN så længe billedet stadig er
// produktets eget: har brugeren bagefter uploadet et andet billede, hører
// navn/pris/link ikke længere til det viste billede.
export function getSingleImageProduct(
  block: Pick<NewsletterBlock, "galleryProductIds" | "imageUrl">,
  products: ShopifyProduct[],
): ShopifyProduct | undefined {
  const product = products.find((item) => item.id === block.galleryProductIds?.[0]);
  if (!product) return undefined;
  return !block.imageUrl || block.imageUrl === product.imageUrl ? product : undefined;
}

// Billedet i et "1 billede"-layout: blokkens eget (upload eller produktvalg)
// – ellers det valgte produkts billede (fx en blok migreret fra gemte data, som
// kun har et produkt-id, se migrateLegacyBlocks).
export function resolveSingleImageUrl(
  block: Pick<NewsletterBlock, "galleryProductIds" | "imageUrl">,
  products: ShopifyProduct[],
): string | undefined {
  return block.imageUrl || getSingleImageProduct(block, products)?.imageUrl || undefined;
}

// Ét kort i Billede-/Galleri-blokken. `product` er sat for produkt-pladser
// (navn, pris og klikbart billede til produktets egen side); et uploadet
// billede har intet bagvedliggende produkt (og derfor intet link) – det kan i
// stedet have en egen overskrift/pris (`upload`). `src` mangler kun for et
// produkt uden billede.
export interface MediaCard {
  key: string;
  src?: string;
  alt: string;
  product?: ShopifyProduct;
  upload?: { title?: string; price?: string };
}

// Teksten under et kort: produktets navn/pris (og link til produktets side)
// eller et uploadet billedes egen overskrift/pris (uden link). Tomme felter
// udelades; et kort uden nogen af dem vises med kun billedet.
export interface MediaCardText {
  title?: string;
  price?: string;
  href?: string;
}

export function getMediaCardText(card: MediaCard, customerType: CustomerType): MediaCardText {
  if (card.product) {
    return {
      title: card.product.title,
      price: formatPriceForCustomer(card.product.price, customerType),
      href: card.product.url,
    };
  }
  return { title: card.upload?.title?.trim() || undefined, price: card.upload?.price?.trim() || undefined };
}

// De kort, blokken viser, i layout-rækkefølge (se getGallerySlots). Tomme
// pladser springes over. Den ENESTE sandhed om blokkens indhold – bruges af
// Preview (NewsletterCard), den kopierede HTML/tekst (newsletterExport) og,
// med "Vis billede" slået fra, til tekstlisten (se resolveMediaListProducts).
export function resolveMediaCards(block: NewsletterBlock, products: ShopifyProduct[]): MediaCard[] {
  if (!isGalleryLayout(block.galleryColumns)) {
    const src = resolveSingleImageUrl(block, products);
    if (!src) return [];
    const product = getSingleImageProduct(block, products);
    return [
      {
        key: "single",
        src,
        alt: block.altText || product?.title || "",
        product,
        upload: product ? undefined : { title: block.imageTitle, price: block.imagePrice },
      },
    ];
  }
  return getGallerySlots(block).flatMap((slot): MediaCard[] => {
    if (slot.kind === "upload") {
      const { imageUrl, altText, title, price } = slot.upload;
      return imageUrl
        ? [{ key: `upload-${slot.index}`, src: imageUrl, alt: altText ?? "", upload: { title, price } }]
        : [];
    }
    const product = products.find((item) => item.id === slot.productId);
    return product
      ? [{ key: `product-${slot.index}-${product.id}`, src: product.imageUrl || undefined, alt: product.title, product }]
      : [];
  });
}

// Linjerne i tekstlisten, når "Vis billede" er slået fra – ét pr. kort med
// tekst (produkt, eller et uploadet billede med egen overskrift/pris). Et
// uploadet billede helt uden tekst har intet at vise i listen og udelades.
export function resolveMediaListItems(
  block: NewsletterBlock,
  products: ShopifyProduct[],
  customerType: CustomerType,
): (MediaCardText & { key: string })[] {
  return resolveMediaCards(block, products).flatMap((card) => {
    const text = getMediaCardText(card, customerType);
    return text.title || text.price ? [{ key: card.key, ...text }] : [];
  });
}

// Ét uploadet billede i Billedeblokken. width/height er billedets pixel-
// størrelse efter nedskalering (se prepareMasonryUpload i
// MasonryBlockControls.tsx) – bruges til at fordele billederne i masonry-
// kolonnerne uden først at skulle indlæse dem.
export interface MasonryImage {
  id: string;
  src: string;
  width: number;
  height: number;
  altText?: string;
}

// Billedeblokkens visning: "fuld" = hvert billede i fuld bredde under
// hinanden; "masonry" = masonry-gitter i 2-5 kolonner (se
// buildMasonryColumns/getMasonryColumns).
export type MasonryLayout = "fuld" | "masonry";

// undefined = "masonry" – billedblokke oprettet før valget fandtes var altid
// masonry-gitre. Nye blokke starter i "fuld" (se createNewBlock).
export function getMasonryLayout(block: Pick<NewsletterBlock, "masonryLayout">): MasonryLayout {
  return block.masonryLayout ?? "masonry";
}
export const MAX_MASONRY_IMAGES = 12;

// Masonry-gitterets antal kolonner. undefined = 3.
export type MasonryColumns = 2 | 3 | 4 | 5;
export const MASONRY_COLUMN_OPTIONS: MasonryColumns[] = [2, 3, 4, 5];
export function getMasonryColumns(block: Pick<NewsletterBlock, "masonryColumns">): MasonryColumns {
  return block.masonryColumns ?? 3;
}

// Afstand mellem billederne (vandret og lodret) – gælder både fuld bredde og
// masonry, i både Preview og mail. undefined = "lille" (de oprindelige 8px).
export type MasonryGap = "ingen" | "lille" | "stor";
export const MASONRY_GAP_PX: Record<MasonryGap, number> = { ingen: 0, lille: 8, stor: 16 };
export function getMasonryGapPx(block: Pick<NewsletterBlock, "masonryGap">): number {
  return MASONRY_GAP_PX[block.masonryGap ?? "lille"];
}

// Billedernes hjørner – samme tre valg som knapper/produktkort.
// undefined = "skarp" (som hidtil). Outlook ignorerer border-radius og viser
// skarpe hjørner (accepteret, samme som CTA-knappen).
export const MASONRY_RADIUS_PX: Record<CtaBorderRadius, number> = { skarp: 0, afrundet: 6, pille: 16 };
export function getMasonryRadiusPx(block: Pick<NewsletterBlock, "masonryRadius">): number {
  return MASONRY_RADIUS_PX[block.masonryRadius ?? "skarp"];
}

// Kolonnebredde i den kopierede HTML: så bredt som muligt, uden at rækken
// overskrider nyhedsbrevets indholdsbredde (MEDIA_CONTENT_WIDTH_PX).
export function getMasonryColumnWidth(columns: number, gapPx: number): number {
  return Math.floor((MEDIA_CONTENT_WIDTH_PX - (columns - 1) * gapPx) / columns);
}

// Fordeler billederne i masonry-kolonner: hvert billede lægges i den
// kolonne, der PT. er kortest (målt i billedernes højde/bredde-forhold, da
// alle kolonner er lige brede) – så kolonnerne ender så lige lange som
// muligt. Rækkefølgen bevares inden for hver kolonne. Den ENESTE udregning,
// så Preview og den kopierede HTML altid viser præcis samme gitter.
export function buildMasonryColumns(images: MasonryImage[], columns: number): MasonryImage[][] {
  const result: MasonryImage[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const image of images) {
    let shortest = 0;
    for (let index = 1; index < columns; index++) {
      if (heights[index] < heights[shortest]) shortest = index;
    }
    result[shortest].push(image);
    heights[shortest] += image.width > 0 ? image.height / image.width : 1;
  }
  return result;
}

// Et billede placeret i masonry-gitteret med sin færdige visningshøjde (i
// mailens pixel-mål, se getMasonryColumnWidth).
export interface MasonryCell {
  image: MasonryImage;
  height: number;
}

export interface MasonryGrid {
  columnWidth: number;
  // Hele gitterets højde – ALLE kolonner ender præcis her.
  height: number;
  columns: MasonryCell[][];
}

// Masonry-gitter, hvor alle kolonner flugter i både top OG bund: billederne
// fordeles som i buildMasonryColumns, og hver kolonne tilpasses derefter den
// fælles højde (gennemsnittet af kolonnernes naturlige højder), ved at hvert
// billede i kolonnen gøres en anelse højere/lavere. Billedet beskæres så
// centreret til sin nye plads (i Preview via object-fit, i mailen via
// cropMasonryImagesForExport) – aldrig forvrænget. Fordi fordelingen allerede
// er afbalanceret, er beskæringen typisk lille. Den ENESTE udregning, så
// Preview og mailen altid viser præcis samme gitter.
export function computeMasonryGrid(images: MasonryImage[], columnCount: number, gapPx: number): MasonryGrid {
  const columnWidth = getMasonryColumnWidth(columnCount, gapPx);
  const distributed = buildMasonryColumns(images, columnCount).filter((column) => column.length > 0);
  const naturalHeights = distributed.map((column) =>
    column.map((image) => (image.width > 0 ? (image.height / image.width) * columnWidth : columnWidth)),
  );
  const columnTotals = naturalHeights.map(
    (heights, index) => heights.reduce((sum, height) => sum + height, 0) + (distributed[index].length - 1) * gapPx,
  );
  const target = Math.round(
    columnTotals.reduce((sum, total) => sum + total, 0) / Math.max(columnTotals.length, 1),
  );
  const columns = distributed.map((column, columnIndex) => {
    const available = target - (column.length - 1) * gapPx;
    const naturalSum = naturalHeights[columnIndex].reduce((sum, height) => sum + height, 0);
    const factor = naturalSum > 0 ? available / naturalSum : 1;
    let used = 0;
    return column.map((image, index): MasonryCell => {
      // Sidste billede tager afrundingsresten, så kolonnen rammer PRÆCIS.
      const height =
        index === column.length - 1
          ? available - used
          : Math.max(1, Math.round(naturalHeights[columnIndex][index] * factor));
      used += height;
      return { image, height };
    });
  });
  return { columnWidth, height: target, columns };
}

// De sociale medier, Sociale medier-blokken understøtter – i den rækkefølge,
// de vises. Knapperne er tekst (platformens navn), IKKE logo-billeder: et
// logo i en mail skal være et billede på en offentlig server (Gmail blokerer
// indlejrede billeder, Outlook viser ikke SVG), så tekstknapper er den
// eneste form, der virker i alle mail-klienter.
export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok" | "pinterest" | "x";

export const SOCIAL_PLATFORMS: { id: SocialPlatform; label: string; example: string }[] = [
  { id: "facebook", label: "Facebook", example: "https://facebook.com/jeresside" },
  { id: "instagram", label: "Instagram", example: "https://instagram.com/jeresprofil" },
  { id: "linkedin", label: "LinkedIn", example: "https://linkedin.com/company/jeresfirma" },
  { id: "youtube", label: "YouTube", example: "https://youtube.com/@jereskanal" },
  { id: "tiktok", label: "TikTok", example: "https://tiktok.com/@jeresprofil" },
  { id: "pinterest", label: "Pinterest", example: "https://pinterest.com/jeresprofil" },
  { id: "x", label: "X", example: "https://x.com/jeresprofil" },
];

// Et link uden protokol (fx "facebook.com/side") får "https://" foran, så
// det virker som link i mailen.
export function normalizeSocialUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// De udfyldte links i platform-rækkefølge – kun dem vises i nyhedsbrevet.
export function getSocialLinks(
  block: Pick<NewsletterBlock, "socialLinks">,
): { platform: SocialPlatform; label: string; url: string }[] {
  return SOCIAL_PLATFORMS.flatMap(({ id, label }) => {
    const url = normalizeSocialUrl(block.socialLinks?.[id] ?? "");
    return url ? [{ platform: id, label, url }] : [];
  });
}

// Højst så mange knapper pr. række – flere brydes til en ny række (ens i
// Preview og mailen, så 7 knapper ikke bliver for brede til mailen).
export const SOCIALS_PER_ROW = 4;

export function chunkSocialLinks<T>(links: T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < links.length; index += SOCIALS_PER_ROW) rows.push(links.slice(index, index + SOCIALS_PER_ROW));
  return rows;
}

// Største antal billeder/kort, blokken kan vise (layout "6 billeder").
export const MAX_MEDIA_ITEMS = 6;

// Det antal billeder, der passer til et givent antal produkter – bruges, når
// blokken fyldes automatisk (createDefaultBlocks/migrateLegacyBlocks), så der
// ikke står tomme pladser tilbage. Højst MAX_MEDIA_ITEMS.
export function mediaLayoutForCount(count: number): MediaLayout {
  return Math.min(Math.max(count, 1), MAX_MEDIA_ITEMS) as MediaLayout;
}

// Et manuelt uploadet billede på én galleri-plads (se
// NewsletterBlock.galleryUploads). imageUrl er en base64 data-URI (samme
// teknik som "1 billede"-uploaden) – undefined, indtil der er valgt en fil.
// `title`/`price` er valgfri, fritekst-overskrift og -pris, som vises under
// billedet i samme kort-stil som et produkts navn/pris (se MediaCard). Prisen
// er bevidst fri tekst (fx "299 kr"), da der intet produkt er at slå
// prisen op på.
export interface GalleryUpload {
  imageUrl?: string;
  altText?: string;
  title?: string;
  price?: string;
}

// Max. filstørrelse for et uploadet galleri-billede (samme loft som logo-
// uploaden på Indstillinger-siden) – et data-URI-billede rejser med selve
// nyhedsbrevets HTML, så det skal holdes nede.
export const MAX_GALLERY_UPLOAD_BYTES = 500 * 1024;

export interface NewsletterBlock {
  id: string;
  type: BlockType;
  hidden: boolean;
  // Kun relevant for tekst-blokke (overskrift/brodtekst/tekst/cta) – indholdet er
  // HTML fra TextBlockEditor (Tiptap). Hver blok-instans har sit eget, uafhængige
  // indhold, så en dupliceret eller ny blok kan redigeres separat fra andre.
  content?: string;
  // Grå hjælpetekst til en TOM tekst-blok (overskrift/brodtekst/tekst/cta) –
  // vises i Edit-mode og Preview, så brugeren ved, hvad blokken er til (fx i
  // "Blank skabelon"). Ren visning: bliver aldrig til indhold, og en tom blok
  // udelades helt af den kopierede mail (se isBlankContent).
  placeholder?: string;
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
  // Valgfri overskrift/pris under et UPLOADET billede ved layout "1" – samme
  // betydning som GalleryUpload.title/price. Ignoreres, når billedet er et
  // valgt produkts (så vises produktets eget navn/pris).
  imageTitle?: string;
  imagePrice?: string;
  alignment?: ImageAlignment;
  size?: ImageSize;
  // Baggrundsfarve for hele blokken – kun relevant for "cta" (knappens
  // baggrund) og baggrunds-bærende struktur-blokke ("header"/"footer").
  // Uden bgColor bruges blokkens eksisterende standardfarve.
  bgColor?: string;
  // Blokkens skrifttype-udgangspunkt – kun relevant for tekst-blokke
  // (overskrift/brodtekst/tekst/cta), sat enten af den globale
  // skrifttype-vælger i Edit-mode (se FONT_FAMILIES) ELLER blokkens EGEN
  // per-blok værktøjslinje (se TextBlockEditor.tsx) – begge skriver til
  // PRÆCIS dette felt og gælder derfor HELE blokkens indhold med det samme,
  // uden at kræve en tekst-markering (samme mønster som textColor herunder).
  fontFamily?: string;
  // Blokkens skriftSTØRRELSE-udgangspunkt (i px) – samme mønster/felt-
  // niveau som fontFamily ovenfor: sat af blokkens egen per-blok
  // værktøjslinje (se TextBlockEditor.tsx), gælder HELE blokkens indhold med
  // det samme, ingen markering krævet. undefined betyder "brug rendering-
  // stedets egen standardstørrelse" (forskellig pr. blok-type – se
  // NewsletterCard.tsx/newsletterExport.ts), ikke en fast, global værdi.
  fontSize?: number;
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
  // Galleri-layoutets fordeling: alle på én række eller fordelt på flere
  // rækker (se GalleryArrangement/getMediaRowSize). undefined = standard
  // efter antal (se getGalleryArrangement).
  galleryArrangement?: GalleryArrangement;
  // Antal billeder pr. række, valgt under "Placering" (se getMediaRowOptions/
  // getMediaRowSize) – har forrang for galleryArrangement ovenfor.
  galleryPerRow?: number;
  // Kun relevant ved galleri-layout (2/3/6). Én post pr. billedplads (index =
  // pladsens nummer): et GalleryUpload-objekt betyder "denne plads viser et
  // manuelt uploadet billede"; null/undefined/manglende post betyder
  // "produkt-plads". Produkt-pladserne fyldes i rækkefølge med
  // galleryProductIds ovenfor – et galleri uden uploads opfører sig derfor
  // præcis som før feltet fandtes. Se getGallerySlots herunder.
  galleryUploads?: (GalleryUpload | null)[];
  // Den samlede Billede-/Galleri-bloks "Vis billede"-kontakt. Blokken viser
  // ALTID produktkort med navn og pris (klikbart billede til produktets egen
  // side). Slået TIL (true/undefined, standard) = billede + navn + pris som
  // kort. Slået FRA = billederne skjules, og produkterne vises som en ren,
  // lodret tekstliste (én linje pr. produkt, klikbart produktnavn) –
  // uafhængigt af layout-valget, som da kun bestemmer antallet.
  showImage?: boolean;
  // Kun relevant for "billedeblok": de uploadede billeder (se
  // buildMasonryColumns for masonry-gitteret).
  masonryImages?: MasonryImage[];
  // Fuld bredde eller masonry-gitter – se MasonryLayout/getMasonryLayout.
  masonryLayout?: MasonryLayout;
  // Masonry: antal kolonner. Begge visninger: afstand og hjørner.
  masonryColumns?: MasonryColumns;
  masonryGap?: MasonryGap;
  masonryRadius?: CtaBorderRadius;
  // Kun relevant for "socials": et link pr. platform (tom/manglende = vises
  // ikke) og en valgfri overskrift over knapperne (fx "Følg os"). Knappernes
  // farve/stil/form genbruger CTA-felterne bgColor/ctaStyle/ctaBorderRadius.
  socialLinks?: Partial<Record<SocialPlatform, string>>;
  socialHeading?: string;
  // Produktkortenes kant-form og tæthed (se PRODUCT_CARD_RADIUS_PX/
  // PRODUCT_ROW_PADDING_PX) – tætheden gælder også tekstlistens linjer.
  // Farven forbliver bevidst fast sort (se NewsletterCard.tsx/
  // newsletterExport.ts).
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

// Vælger ÉT produkt til enkelt-billede-layoutet – bruges her af billede-
// blokkens galleryColumns===1-gren i både createDefaultBlocks og
// createBlocksFromTemplate herunder, OG (eksporteret) af generate-
// newsletter/route.ts til det repræsentative billede, der sendes med i
// selve API-svaret. Foretrækker den foretrukne productId (AI'ens valg,
// hhv. en bestseller – se kalderne), men KUN hvis det produkt rent faktisk
// har et billede, samme regel som pickGalleryProducts ovenfor bruger for
// galleriet. Har det foretrukne produkt intet billede (fx et af de
// matchede produkter uden Shopify-billede), findes i stedet det FØRSTE
// valgte produkt, der har et – i stedet for blindt at sætte imageUrl til en
// tom streng og lade blokken/billedet stå uden billede uden varsel (den
// oprindelige fejl).
// Har INGEN af de valgte produkter et billede, falder vi til sidst tilbage
// til AI'ens valg (eller det først valgte), som hidtil – der er ganske
// enkelt intet billede at vise i den situation.
export function pickRepresentativeProduct(
  products: ShopifyProduct[],
  preferredProductId: string | undefined,
): ShopifyProduct | undefined {
  const preferred = products.find((product) => product.id === preferredProductId);
  if (preferred?.hasImage && preferred.imageUrl) {
    return preferred;
  }
  const firstWithImage = products.find((product) => product.hasImage && product.imageUrl);
  return firstWithImage ?? preferred ?? products[0];
}

// Kompatibilitet med GEMTE data (udkast i localStorage, skabeloner i
// Supabase) fra før den selvstændige produktliste-blok blev fjernet: en sådan
// blok har denne type-streng og sit produktvalg i `productDisplayIds`. Den
// omdannes her til den samlede Billede-/Galleri-blok (højst 6 produkter,
// layoutet vælges ud fra antallet), så resten af appen kun kender ÉN blok-
// type. Ingen ny kode producerer typen.
const LEGACY_PRODUCT_LIST_TYPE = "produktvisning";

type StoredBlock = Omit<NewsletterBlock, "type"> & { type: string; productDisplayIds?: string[] };

export function isLegacyProductListType(type: string): boolean {
  return type === LEGACY_PRODUCT_LIST_TYPE;
}

export function migrateLegacyBlocks(blocks: StoredBlock[]): NewsletterBlock[] {
  return blocks.map((stored) => {
    const { productDisplayIds, ...block } = stored;
    if (!isLegacyProductListType(block.type)) return block as NewsletterBlock;
    const productIds = (productDisplayIds ?? []).slice(0, MAX_MEDIA_ITEMS);
    const galleryColumns = mediaLayoutForCount(productIds.length);
    return {
      ...block,
      type: "billede",
      textColor: undefined,
      galleryColumns,
      galleryProductIds: galleryColumns === 1 ? productIds.slice(0, 1) : productIds,
    };
  });
}

// Fylder en billede-blok med produkter ud fra seed-puljen. Galleri-layout:
// kurateret udsnit (se pickGalleryProducts). "1 billede": ét repræsentativt
// produkt, hvis billede, navn og id sættes, så kortet har både billede, navn
// og pris at vise.
function fillMediaBlock(
  block: NewsletterBlock,
  columns: MediaLayout,
  selectedProducts: ShopifyProduct[],
  preferredProductId: string | undefined,
) {
  block.galleryColumns = columns;
  if (isGalleryLayout(columns)) {
    block.galleryProductIds = pickGalleryProducts(selectedProducts, columns).map((product) => product.id);
    return;
  }
  // Slå produktet op blandt de faktisk valgte produkter ud fra det
  // productId, AI'en pegede på – vi stoler ikke på, at Gemini har kopieret
  // imageUrl'en korrekt videre, kun på at productId identificerer det
  // rigtige produkt. Findes det ikke, eller mangler det et billede, falder vi
  // tilbage til det først valgte produkt, der HAR et billede (se
  // pickRepresentativeProduct).
  const matchedProduct = pickRepresentativeProduct(selectedProducts, preferredProductId);
  if (matchedProduct) {
    block.imageUrl = matchedProduct.imageUrl;
    block.altText = matchedProduct.title;
    block.galleryProductIds = [matchedProduct.id];
  }
}

export function createDefaultBlocks(
  result: GeneratedNewsletter,
  customerType: CustomerType,
  // De "seed"-produkter, genereringen skal bygges ud fra (fra
  // generate-newsletter/route.ts: de FØRSTE N af det fulde matchede sæt,
  // N = "Maks. antal produkter"-grænsen, se seedProducts der) – bruges som
  // fallback for billede-blokken, hvis AI-svarets productId ikke kan slås op
  // (se nedenfor), og afgør billede-/galleri-blokkens
  // layout og INITIALE produkter (se type==="billede" herunder). Dette er en AFGRÆNSET seed-pulje, IKKE det fulde matchede
  // sæt – Edit-mode's produktvælgere henter i stedet fra HELE puljen (se
  // topicMatchedProductIds i NewsletterContext.tsx), uafhængigt af denne.
  selectedProducts: ShopifyProduct[],
  brandDefaults: BrandDefaults,
): NewsletterBlock[] {
  // Én samlet Billede-/Galleri-blok med produktkort (billede + navn + pris).
  // Den er kun den automatiske starttilstand; brugeren kan altid ændre
  // layout/produkter/"Vis billede" i Edit-mode bagefter, med adgang til HELE
  // det matchede sæt (ikke kun seed-puljen).
  const blockTypes: BlockType[] = [
    "header",
    "overskrift",
    "brodtekst",
    "billede",
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
      // Seed-puljens produkter MED billede (samme regel som produktvælgeren
      // i blokken), højst 6 – layoutet vælges ud fra antallet, så der ikke
      // står tomme pladser tilbage. Kun ét: "1 billede" med det
      // repræsentative produkt (se pickRepresentativeProduct).
      block.showImage = true;
      const withImages = selectedProducts.filter((product) => product.hasImage && product.imageUrl);
      const columns = mediaLayoutForCount(Math.min(withImages.length, MAX_MEDIA_ITEMS));
      fillMediaBlock(block, columns, columns === 1 ? selectedProducts : withImages, result.image.productId);
    }
    if (type === "cta") {
      block.content = result.cta.text;
      block.originalCtaText = result.cta.text;
      block.ctaUrl = result.cta.url;
    }
    return block;
  });
}

// Er en tekst-bloks indhold reelt tomt (fx Tiptaps tomme "<p></p>")? Så
// vises dens placeholder i Preview, og blokken udelades af den kopierede mail.
export function isBlankContent(content: string | undefined): boolean {
  return !content || content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

// "Blank skabelon" på Opsætning-siden: et nyhedsbrev, brugeren selv bygger
// fra bunden – INGEN AI-generering og INGEN produktdata. Det har en typisk
// nyhedsbrevs-opbygning med TOMME blokke, der hver viser en grå placeholder
// (overskrift, brødtekst, billedeblok, knap), så brugeren kan se, hvad der
// skal udfyldes. Tomme blokke kommer ikke med i den kopierede mail.
export const BLANK_NEWSLETTER: GeneratedNewsletter = {
  heading: "",
  bodyText: "",
  // altText vises i billed-blokkens tomme pladsholder (se NewsletterCard).
  image: { productId: "", imageUrl: "", altText: "Tilføj et billede – upload dit eget eller vælg et produkt" },
  cta: { text: "", url: "" },
};

export function createBlankBlocks(brandDefaults: BrandDefaults): NewsletterBlock[] {
  const textDefaults = {
    fontFamily: resolveFontFamily(brandDefaults.primaryFont),
    textColor: brandDefaults.primaryColor,
  };
  return [
    { id: "header", type: "header", hidden: false },
    {
      id: "overskrift",
      type: "overskrift",
      hidden: false,
      content: "",
      placeholder: "Skriv en fængende overskrift – fx 'Forårets nyheder er landet'",
      ...textDefaults,
    },
    {
      id: "brodtekst",
      type: "brodtekst",
      hidden: false,
      content: "",
      placeholder:
        "Skriv din hilsen og brødtekst her – fortæl kort, hvad nyhedsbrevet handler om, og hvorfor modtageren skal læse videre.",
      ...textDefaults,
    },
    // Billedeblokken (egne uploads) frem for "Billede & produktvisning" – et
    // blankt nyhedsbrev har ingen produktdata at vælge imellem.
    { id: "billedeblok", type: "billedeblok", hidden: false, masonryImages: [], masonryLayout: "fuld" },
    { id: "skillelinje", type: "skillelinje", hidden: false },
    {
      id: "cta",
      type: "cta",
      hidden: false,
      content: "",
      ctaUrl: "",
      placeholder: "Knaptekst – fx 'Se udvalget'",
      ...textDefaults,
    },
    { id: "footer", type: "footer", hidden: false },
  ];
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
// originalCtaText/productId/imageUrl/altText/imageTitle/imagePrice/
// galleryProductIds/galleryUploads (alt sammen enten AI-tekst, et konkret link, eller et
// konkret produkt-/billedvalg).
// productBorderRadius/productDensity/showImage ER med – rene
// stilvalg, samme princip som ctaBorderRadius/ctaPadding/galleryColumns.
export type TemplateBlock = Pick<
  NewsletterBlock,
  | "type"
  | "hidden"
  | "fontFamily"
  | "fontSize"
  | "textColor"
  | "bgColor"
  | "alignment"
  | "size"
  | "ctaPadding"
  | "ctaBorderRadius"
  | "ctaStyle"
  | "galleryColumns"
  | "galleryArrangement"
  | "galleryPerRow"
  | "productBorderRadius"
  | "productDensity"
  | "showImage"
  | "masonryLayout"
  | "masonryColumns"
  | "masonryGap"
  | "masonryRadius"
  | "socialLinks"
  | "socialHeading"
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
    fontSize: block.fontSize,
    textColor: block.textColor,
    bgColor: block.bgColor,
    alignment: block.alignment,
    size: block.size,
    ctaPadding: block.ctaPadding,
    ctaBorderRadius: block.ctaBorderRadius,
    ctaStyle: block.ctaStyle,
    galleryColumns: block.galleryColumns,
    galleryArrangement: block.galleryArrangement,
    galleryPerRow: block.galleryPerRow,
    productBorderRadius: block.productBorderRadius,
    productDensity: block.productDensity,
    showImage: block.showImage,
    masonryLayout: block.masonryLayout,
    masonryColumns: block.masonryColumns,
    masonryGap: block.masonryGap,
    masonryRadius: block.masonryRadius,
    // Sociale medie-links er virksomhedens faste profiler (ikke AI-tekst
    // eller et produktvalg) – de følger med skabelonen.
    socialLinks: block.socialLinks,
    socialHeading: block.socialHeading,
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
  // fulde matchede sæt. Bruges her til billede-/galleri-blokkens
  // initiale produkter, se herunder.
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
    // Samme gælder en gemt blok af den fjernede produktliste-type (se
    // migrateLegacyBlocks) – den bliver til en billede-blok.
    const isLegacyProductDisplay = isLegacyProductListType(templateBlock.type);
    const normalizedType: BlockType =
      templateBlock.type === "img" || templateBlock.type === "galleri" || isLegacyProductDisplay
        ? "billede"
        : templateBlock.type;

    // Skabelonens EGEN gemte fontFamily/textColor vinder altid, hvis den er
    // sat – brand-defaults fylder kun hullet ud, hvis skabelonen aldrig fik
    // sat en eksplicit værdi for netop den blok (fx en skabelon gemt før
    // nogen rørte den globale farve/skrifttype-vælger).
    const block: NewsletterBlock = {
      id: `${normalizedType}-${crypto.randomUUID()}`,
      type: normalizedType,
      hidden: templateBlock.hidden,
      fontFamily: templateBlock.fontFamily,
      fontSize: templateBlock.fontSize,
      textColor: isLegacyProductDisplay ? undefined : templateBlock.textColor,
      bgColor: templateBlock.bgColor,
      alignment: templateBlock.alignment,
      size: templateBlock.size,
      ctaPadding: templateBlock.ctaPadding,
      ctaBorderRadius: templateBlock.ctaBorderRadius,
      ctaStyle: templateBlock.ctaStyle,
      socialLinks: templateBlock.socialLinks,
      socialHeading: templateBlock.socialHeading,
      galleryArrangement: templateBlock.galleryArrangement,
      galleryPerRow: templateBlock.galleryPerRow,
      productBorderRadius: templateBlock.productBorderRadius,
      productDensity: templateBlock.productDensity,
      showImage: templateBlock.showImage,
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
      // En gemt blok af den fjernede produktliste-type havde intet layout-
      // valg – den får samme antal-baserede layout som createDefaultBlocks.
      const legacyProductCount = selectedProducts.filter((product) => product.hasImage && product.imageUrl).length;
      const columns: MediaLayout = isLegacyProductDisplay
        ? mediaLayoutForCount(Math.min(legacyProductCount, MAX_MEDIA_ITEMS))
        : (templateBlock.galleryColumns ?? 1);
      fillMediaBlock(block, columns, selectedProducts, result.image.productId);
    }
    if (block.type === "produkt") {
      block.productId = selectedProducts[0]?.id;
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
    // Billedeblokkens billeder er indhold (strippet med vilje, ligesom
    // galleryUploads) – blokken starter tom, klar til nye uploads, men med
    // skabelonens visning (fuld bredde / masonry).
    if (block.type === "billedeblok") {
      block.masonryImages = [];
      block.masonryLayout = templateBlock.masonryLayout;
      block.masonryColumns = templateBlock.masonryColumns;
      block.masonryGap = templateBlock.masonryGap;
      block.masonryRadius = templateBlock.masonryRadius;
    }
    if (block.type === "tekst") {
      block.content = "Ny tekstblok – redigér indholdet her";
    }

    return block;
  });
}

// De typer, der kan tilføjes via "+ Tilføj blok"-menuen. Billede, Galleri og
// produktlisten er BEVIDST slået sammen til ét "billede"-valg – layout-valget
// (1/2/3/6, se MediaLayout) og "Vis billede" vælges bagefter inde i selve
// blokken, ikke i denne menu.
export type AddableBlockKind = "tekst" | "billede" | "billedeblok" | "knap" | "socials" | "skillelinje";

export const ADDABLE_BLOCK_KINDS: AddableBlockKind[] = ["tekst", "billede", "billedeblok", "knap", "socials", "skillelinje"];

export function createNewBlock(kind: AddableBlockKind): NewsletterBlock {
  const id = `${kind}-${crypto.randomUUID()}`;

  switch (kind) {
    case "tekst":
      return { id, type: "tekst", hidden: false, content: "Ny tekstblok – redigér indholdet her" };
    case "billede":
      // Default til layout "1 billede", tomt – brugeren vælger selv upload
      // eller søgbart produktvalg (ImageBlockControls), jf.
      // opgavebeskrivelsen ("default til INGEN valgt", ligesom det øvrige
      // billede-flow ikke gætter for brugeren). "Vis billede" starter slået TIL.
      return { id, type: "billede", hidden: false, galleryColumns: 1, showImage: true };
    case "socials":
      return {
        id,
        type: "socials",
        hidden: false,
        socialHeading: "Følg os",
        socialLinks: {},
        bgColor: "#111111",
        ctaStyle: "udfyldt",
        ctaBorderRadius: "pille",
      };
    case "billedeblok":
      return {
        id,
        type: "billedeblok",
        hidden: false,
        masonryImages: [],
        masonryLayout: "fuld",
      };
    case "knap":
      return { id, type: "cta", hidden: false, content: "Se sortimentet", ctaUrl: "" };
    case "skillelinje":
      return { id, type: "skillelinje", hidden: false };
  }
}
