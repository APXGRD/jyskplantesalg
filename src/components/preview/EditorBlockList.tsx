"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import type { CustomerType } from "@/lib/format";
import { resolveCtaLink } from "@/lib/ctaLink";
import { TextBlockEditor } from "@/components/TextBlockEditor";
import { ImageBlockControls } from "@/components/ImageBlockControls";
import { GalleryBlockControls, type GallerySlotMode } from "@/components/GalleryBlockControls";
import { ColorSwatches } from "@/components/ColorSwatches";
import { MasonryBlockControls } from "@/components/MasonryBlockControls";
import { CtaButton, SocialButtons } from "@/components/preview/NewsletterCard";
import { getContrastTextColor, stripColorStyles } from "@/lib/brandColors";
import { formatFooterAddressLine, useBrandSettings } from "@/context/BrandSettingsContext";
import { FONT_FAMILIES, stripFontFamilyStyles, stripFontSizeStyles } from "@/lib/fontFamilies";
import {
  ArrowLeftIcon,
  ButtonIcon,
  ChevronDownIcon,
  DividerIcon,
  DuplicateIcon,
  GalleryIcon,
  EyeIcon,
  EyeOffIcon,
  GearIcon,
  GripIcon,
  ImagePlaceholderIcon,
  PlusIcon,
  RefreshIcon,
  ShareIcon,
  SpinnerIcon,
  TextIcon,
  TrashIcon,
} from "@/components/icons";
import {
  buildBodyTextHtml,
  createNewBlock,
  duplicateBlock,
  getGalleryProductSlotCount,
  getGallerySlots,
  getSingleImageProduct,
  getMediaRowOptions,
  getMasonryColumns,
  getMasonryLayout,
  getMediaRowSize,
  getSocialLinks,
  isGalleryLayout,
  resolveSingleImageUrl,
  SOCIAL_PLATFORMS,
  MEDIA_LAYOUT_OPTIONS,
  RICH_TEXT_BLOCK_TYPES,
  type AddableBlockKind,
  type BlockType,
  type CtaBorderRadius,
  type CtaPadding,
  type CtaStyle,
  type GalleryUpload,
  type MasonryColumns,
  type MasonryGap,
  type MasonryImage,
  type MasonryLayout,
  type MediaLayout,
  type ImageAlignment,
  type ImageSize,
  type NewsletterBlock,
  type ProductListDensity,
} from "@/lib/newsletterBlocks";
import { SearchableProductChecklist } from "@/components/SearchableProductChecklist";

type BlockBadge = "Struktur" | "AI-tekst" | "Produktdata" | "Egne billeder";

// "billede" er den eneste type, ny kode fra nu af producerer; "img" og
// "galleri" er kun stadig anerkendte type-strenge, så allerede gemte
// nyhedsbrev-udkast/skabeloner fra FØR Billede og Galleri blev konsolideret
// til én blok-type stadig får samme titel/badge (se BlockContent's samlede
// "billede"-case herunder).
// Den samlede blok kan BÅDE vise billeder og produkter (navn, pris og link
// til produktets side) – navnet siger derfor begge dele, så brugeren ved, at
// den også er stedet til produktvisning.
const MEDIA_BLOCK_TITLE = "Billede & produktvisning";
const MEDIA_BLOCK_DESCRIPTION = "Billeder og produkter med navn, pris og link";

// `subtitle` vises efter titlen i blok-kortets top ("01. HEADER // LOGO &
// BUTIKSNAVN") – kun en beskrivende tekst, ingen funktion.
const BLOCK_META: Record<BlockType, { title: string; subtitle?: string; badge: BlockBadge }> = {
  header: { title: "Header", subtitle: "Logo & butiksnavn", badge: "Struktur" },
  overskrift: { title: "Overskrift", subtitle: "Headline", badge: "AI-tekst" },
  brodtekst: { title: "Brødtekst", subtitle: "Intro & salgskopi", badge: "AI-tekst" },
  billede: { title: MEDIA_BLOCK_TITLE, badge: "Produktdata" },
  skillelinje: { title: "Skillelinje", subtitle: "Luft & divider", badge: "Struktur" },
  cta: { title: "Knap / CTA", badge: "AI-tekst" },
  footer: { title: "Footer", subtitle: "Juridisk & adresse", badge: "Struktur" },
  tekst: { title: "Tekst", subtitle: "Fritekst", badge: "AI-tekst" },
  img: { title: MEDIA_BLOCK_TITLE, badge: "Produktdata" },
  produkt: { title: "Produkt", badge: "Produktdata" },
  galleri: { title: MEDIA_BLOCK_TITLE, badge: "Produktdata" },
  billedeblok: { title: "Billedeblok", subtitle: "Fuld bredde / masonry", badge: "Egne billeder" },
  socials: { title: "Sociale medier", subtitle: "Facebook, Instagram …", badge: "Struktur" },
};

// Den samlede billede-/produktblok er nyhedsbrevets kerne og fremhæves med
// en kraftigere ramme (samme type-regel som BLOCK_META ovenfor).
function isMediaBlockType(type: BlockType): boolean {
  return type === "billede" || type === "img" || type === "galleri";
}

const ADD_BLOCK_OPTIONS: {
  kind: AddableBlockKind;
  label: string;
  description?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}[] = [
  { kind: "tekst", label: "Tekst", icon: TextIcon },
  { kind: "billede", label: MEDIA_BLOCK_TITLE, description: MEDIA_BLOCK_DESCRIPTION, icon: ImagePlaceholderIcon },
  {
    kind: "billedeblok",
    label: "Billedeblok",
    description: "Egne uploadede billeder i fuld bredde eller masonry-gitter",
    icon: GalleryIcon,
  },
  { kind: "knap", label: "Knap", icon: ButtonIcon },
  {
    kind: "socials",
    label: "Sociale medier",
    description: "Links til fx Facebook, Instagram og LinkedIn",
    icon: ShareIcon,
  },
  { kind: "skillelinje", label: "Skillelinje", icon: DividerIcon },
];

const BADGE_STYLES: Record<BlockBadge, string> = {
  Struktur: "border-neutral-300 bg-white text-neutral-600",
  "AI-tekst": "border-emerald-300 bg-emerald-50 text-emerald-800",
  Produktdata: "border-black bg-black text-white",
  "Egne billeder": "border-sky-300 bg-sky-50 text-sky-800",
};

function Badge({ type }: { type: BlockBadge }) {
  return (
    <span
      className={`hidden shrink-0 border px-1.5 py-0.5 font-jetbrains text-[9px] font-semibold tracking-wider uppercase @sm:inline ${BADGE_STYLES[type]}`}
    >
      {type}
    </span>
  );
}

const fieldClassName =
  "w-full rounded-none border border-neutral-300 bg-[#fdfdfb] px-3 py-2 font-jetbrains text-xs text-neutral-900 focus:border-black focus:outline-none";

// Feltetiketter i blokkene ("Antal billeder:", "Tekstfarve:" …).
const labelClassName = "font-jetbrains text-xs text-neutral-600";
// Beskrivende hjælpetekst øverst i en blok.
const helpTextClassName = "font-jetbrains text-xs text-neutral-500";

// Kompakt gruppe af gensidigt udelukkende valg (samme mønster som
// ImageBlockControls' justering/størrelse-knapper) – bruges til CTA-knappens
// padding/knap-form/stil, med et valgfrit lille preview-element pr. knap (fx
// en hjørne-forhåndsvisning for knap-formerne).
function SegmentedButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; preview?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          title={option.label}
          className={`flex min-w-0 items-center justify-center gap-2 border px-2 py-1.5 text-center font-jetbrains text-[11px] leading-tight transition-colors ${
            value === option.value
              ? "border-black bg-neutral-200 font-bold text-black"
              : "border-neutral-300 bg-white text-neutral-600 hover:border-black"
          }`}
        >
          {option.preview}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

const CTA_PADDING_OPTIONS: { value: CtaPadding; label: string }[] = [
  { value: "kompakt", label: "Kompakt" },
  { value: "normal", label: "Normal" },
  { value: "rummelig", label: "Rummelig" },
];

const CTA_BORDER_RADIUS_OPTIONS: { value: CtaBorderRadius; label: string }[] = [
  { value: "skarp", label: "Skarpe hjørner" },
  { value: "afrundet", label: "Let afrundet" },
  { value: "pille", label: "Pilleform" },
];

const CTA_STYLE_OPTIONS: { value: CtaStyle; label: string }[] = [
  { value: "udfyldt", label: "Udfyldt" },
  { value: "kontur", label: "Kontur" },
];

// Produktkortenes/tekstlistens "Tæthed"-valg (Billede/Galleri) –
// se PRODUCT_ROW_PADDING_PX i newsletterBlocks.ts, brugt af både Preview og
// den kopierede HTML.
const PRODUCT_DENSITY_OPTIONS: { value: ProductListDensity; label: string }[] = [
  { value: "kompakt", label: "Kompakt" },
  { value: "normal", label: "Normal" },
];

// Lille visuel forhåndsvisning af, hvordan `count` billeder fordeles med
// `perRow` pr. række – bruges på "Placering"-knapperne.
function ArrangementPreview({ count, perRow }: { count: number; perRow: number }) {
  const rows: number[] = [];
  for (let remaining = count; remaining > 0; remaining -= perRow) rows.push(Math.min(perRow, remaining));
  return (
    <span className="flex flex-col items-center gap-0.5" aria-hidden>
      {rows.map((size, rowIndex) => (
        <span key={rowIndex} className="flex gap-0.5">
          {Array.from({ length: size }, (_, index) => (
            <span key={index} className="h-2 w-2 bg-current" />
          ))}
        </span>
      ))}
    </span>
  );
}

// Tekst til et "Placering"-valg: `count` billeder med `perRow` pr. række,
// fx "Alle på én række (6)", "3 + 3", "2 + 2 + 2" eller "Under hinanden".
function describeRows(count: number, perRow: number): string {
  if (perRow >= count) return `Alle på én række (${count})`;
  if (perRow === 1) return "Under hinanden";
  const rows: number[] = [];
  for (let remaining = count; remaining > 0; remaining -= perRow) rows.push(Math.min(perRow, remaining));
  return rows.join(" + ");
}

// CTA-blokkens udvidede styling (Padding/Knap-form/Stil) er sammenklappet som
// standard – kun URL-feltet og Knapfarve-vælgeren vises med det samme. Åben/
// lukket er lokal, ikke-persisteret UI-state pr. blok-instans (ikke en del af
// selve blokken i blocks-state), så den altid starter sammenklappet igen ved
// genindlæsning, og lukker/åbner uden at ændre nogen af de valgte værdier.
function CtaAdvancedControls({
  block,
  onCtaPaddingChange,
  onCtaBorderRadiusChange,
  onCtaStyleChange,
}: {
  block: NewsletterBlock;
  onCtaPaddingChange: (padding: CtaPadding) => void;
  onCtaBorderRadiusChange: (borderRadius: CtaBorderRadius) => void;
  onCtaStyleChange: (style: CtaStyle) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className={labelClassName}>Padding:</span>
        <SegmentedButtons
          options={CTA_PADDING_OPTIONS}
          value={block.ctaPadding ?? "normal"}
          onChange={onCtaPaddingChange}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <span className={labelClassName}>Knap-form:</span>
        <SegmentedButtons
          value={block.ctaBorderRadius ?? "afrundet"}
          onChange={onCtaBorderRadiusChange}
          options={CTA_BORDER_RADIUS_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClassName}>Stil:</span>
        <SegmentedButtons options={CTA_STYLE_OPTIONS} value={block.ctaStyle ?? "udfyldt"} onChange={onCtaStyleChange} />
      </div>
      </div>
    </div>
  );
}

interface BlockContentProps {
  block: NewsletterBlock;
  onContentChange: (html: string) => void;
  onCtaUrlChange: (url: string) => void;
  onProductIdChange: (productId: string) => void;
  onImageChange: (imageUrl: string) => void;
  onAltTextChange: (altText: string) => void;
  // Overskrift/pris under et UPLOADET billede ved layout "1" (se
  // NewsletterBlock.imageTitle/imagePrice).
  onImageTitleChange: (imageTitle: string) => void;
  onImagePriceChange: (imagePrice: string) => void;
  onAlignmentChange: (alignment: ImageAlignment) => void;
  onSizeChange: (size: ImageSize) => void;
  onBgColorChange: (color: string) => void;
  // Sætter block.textColor for netop DENNE blok – bruges af Overskrift/
  // Brødtekst/Tekst/CTA's egne "Tekstfarve"-swatches (til forskel fra
  // handleGlobalColorChange, som sætter samme felt på ALLE tekst-blokke på
  // én gang).
  onTextColorChange: (color: string) => void;
  // Sætter block.fontFamily/block.fontSize for netop DENNE blok – bruges af
  // TextBlockEditor.tsx's egen per-blok værktøjslinje (til forskel fra
  // handleGlobalFontChange, som sætter fontFamily på ALLE tekst-blokke på én
  // gang). Samme mønster som onTextColorChange ovenfor: gælder HELE
  // blokkens indhold med det samme, ingen tekst-markering krævet.
  onFontFamilyChange: (fontFamily: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  onCtaPaddingChange: (padding: CtaPadding) => void;
  onCtaBorderRadiusChange: (borderRadius: CtaBorderRadius) => void;
  onCtaStyleChange: (style: CtaStyle) => void;
  onGalleryProductIdsChange: (productIds: string[]) => void;
  onGalleryColumnsChange: (layout: MediaLayout) => void;
  // Galleri-layout: antal billeder pr. række ("Placering").
  onGalleryPerRowChange: (perRow: number) => void;
  // Galleri-layout: skift en enkelt plads mellem produkt og upload, og sæt
  // en upload-plads' billede/alt-tekst.
  onGallerySlotModeChange: (index: number, mode: GallerySlotMode) => void;
  onGallerySlotUploadChange: (index: number, upload: GalleryUpload) => void;
  // Kun relevant for den samlede Billede-/Galleri-blok ved layout "1" – sætter
  // billedet ud fra et produkt valgt via den søgbare vælger (se
  // handleImageProductSelect i EditorBlockList).
  onImageProductSelect: (productId: string) => void;
  // Billede-/Galleri-blokkens "Vis billede"-kontakt og produktkortenes
  // kant-form/tæthed.
  onShowImageChange: (showImage: boolean) => void;
  // Kun relevant for "billedeblok": de uploadede billeder og antal kolonner.
  onMasonryImagesChange: (images: MasonryImage[]) => void;
  onMasonryLayoutChange: (layout: MasonryLayout) => void;
  // Billedeblok: kolonner (masonry), afstand og hjørner.
  onMasonryPatch: (patch: Pick<NewsletterBlock, "masonryColumns" | "masonryGap" | "masonryRadius">) => void;
  // Sociale medier: links pr. platform og overskrift.
  onSocialsPatch: (patch: Pick<NewsletterBlock, "socialLinks" | "socialHeading">) => void;
  onProductBorderRadiusChange: (borderRadius: CtaBorderRadius) => void;
  onProductDensityChange: (density: ProductListDensity) => void;
  products: ShopifyProduct[];
  // HELE det matchede produkt-sæt fra en emne-søgning (se
  // NewsletterContext.topicMatchedProductIds) – null ved almindeligt
  // manuelt produktvalg. Bruges til at afgøre, om et ekstra søgefelt skal
  // vises oven på produktvælgerne i den samlede Billede-/Galleri-blok (case
  // "billede"/"img"/"galleri" herunder); selve produktlisten kommer fortsat
  // fra `products` ovenfor.
  topicMatchedProductIds: string[] | null;
  // Nyhedsbrevets målgruppe – til produkternes pris i produktvælgerne.
  customerType: CustomerType;
}

function BlockContent({
  block,
  onContentChange,
  onCtaUrlChange,
  onProductIdChange,
  onImageChange,
  onAltTextChange,
  onImageTitleChange,
  onImagePriceChange,
  onAlignmentChange,
  onSizeChange,
  onBgColorChange,
  onTextColorChange,
  onFontFamilyChange,
  onFontSizeChange,
  onCtaPaddingChange,
  onCtaBorderRadiusChange,
  onCtaStyleChange,
  onGalleryProductIdsChange,
  onGalleryColumnsChange,
  onGalleryPerRowChange,
  onGallerySlotModeChange,
  onGallerySlotUploadChange,
  onImageProductSelect,
  onShowImageChange,
  onMasonryImagesChange,
  onMasonryLayoutChange,
  onMasonryPatch,
  onSocialsPatch,
  onProductBorderRadiusChange,
  onProductDensityChange,
  products,
  topicMatchedProductIds,
  customerType,
}: BlockContentProps) {
  // Kun til header-/footer-blokkenes små farve-forhåndsvisninger – samme
  // standardbaggrunde som NewsletterCard.tsx.
  const brand = useBrandSettings();
  const headerBgColor = block.bgColor || brand.colors[0] || "#111111";
  const footerBgColor = block.bgColor || "#f5f7f4";

  switch (block.type) {
    case "header":
      return (
        <div className="flex flex-col gap-3">
          <p className={helpTextClassName}>Logo og butiksnavn – vises fast øverst i nyhedsbrevet.</p>
          <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
            <ColorSwatches label="Baggrund" value={block.bgColor} onChange={onBgColorChange} />
            <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} autoOption />
          </div>
          {/* Lille forhåndsvisning af headerens farver – samme regel som
              NewsletterCard (valgt farve, ellers auto sort/hvid). */}
          <div
            className="border border-black/10 p-3 text-center font-jetbrains text-xs tracking-widest uppercase"
            style={{ backgroundColor: headerBgColor, color: block.textColor || getContrastTextColor(headerBgColor) }}
          >
            {brand.name || "Logo"}
          </div>
        </div>
      );

    case "overskrift":
      return (
        <div className="flex flex-col gap-3">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
            placeholder={block.placeholder}
          />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
        </div>
      );

    case "brodtekst":
      return (
        <div className="flex flex-col gap-3">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
            placeholder={block.placeholder}
          />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
        </div>
      );

    case "tekst":
      return (
        <div className="flex flex-col gap-3">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
            placeholder={block.placeholder}
          />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
        </div>
      );

    // "billede" er den eneste type, ny kode fra nu af producerer; "img" og
    // "galleri" er kun stadig anerkendte type-strenge, så allerede gemte
    // nyhedsbrev-udkast/skabeloner fra FØR Billede og Galleri blev
    // konsolideret til én blok-type stadig redigeres korrekt. Selve
    // layout-valget (enkelt billede vs. galleri) afgøres udelukkende af
    // block.galleryColumns via layout-knapperne herunder, ikke af hvilken af
    // de tre typer det er.
    case "billede":
    case "img":
    case "galleri": {
      const layout: MediaLayout = block.galleryColumns ?? 1;
      const showProductSearch = topicMatchedProductIds !== null;
      const showImage = block.showImage ?? true;
      return (
        <div className="flex flex-col gap-5">
          <p className={helpTextClassName}>
            Vis billeder og produkter – vælg produkter (med navn, pris og link til produktets side) eller upload
            egne billeder.
          </p>
          <label className="relative flex cursor-pointer items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <span className="flex flex-col gap-0.5">
              <span className="font-jetbrains text-xs font-bold text-neutral-900">Vis billede</span>
              <span className="font-jetbrains text-[11px] text-neutral-500">
                {showImage
                  ? "Produktkort med billede, navn og pris – billedet linker til produktets side."
                  : "Tekstliste med navn og pris – produktnavnet linker til produktets side."}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={showImage}
              onChange={(event) => onShowImageChange(event.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-1 ${
                showImage ? "bg-neutral-900" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full border border-neutral-300 bg-white transition-transform ${
                  showImage ? "translate-x-5 border-white" : ""
                }`}
              />
            </span>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={labelClassName}>Antal billeder:</span>
            <div className="grid max-w-sm grid-cols-6 gap-1">
              {MEDIA_LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onGalleryColumnsChange(option)}
                  aria-pressed={layout === option}
                  aria-label={option === 1 ? "1 billede" : `${option} billeder`}
                  className={`border py-1 text-center font-jetbrains text-xs transition-colors ${
                    layout === option
                      ? "border-black bg-black font-bold text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-black"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Kun relevant, når billederne står side om side (Vis billede
              slået til) – tekstlisten er altid lodret. */}
          {isGalleryLayout(layout) && showImage && (
            <div className="flex max-w-md flex-col gap-1.5">
              <span className={labelClassName}>Placering:</span>
              <SegmentedButtons
                value={String(getMediaRowSize(block))}
                onChange={(perRow) => onGalleryPerRowChange(Number(perRow))}
                options={getMediaRowOptions(layout).map((perRow) => ({
                  value: String(perRow),
                  label: describeRows(layout, perRow),
                  preview: <ArrangementPreview count={layout} perRow={perRow} />,
                }))}
              />
            </div>
          )}

          {isGalleryLayout(layout) ? (
            <GalleryBlockControls
              products={products}
              selectedProductIds={block.galleryProductIds ?? []}
              columns={layout}
              uploads={block.galleryUploads}
              onProductIdsChange={onGalleryProductIdsChange}
              onSlotModeChange={onGallerySlotModeChange}
              onSlotUploadChange={onGallerySlotUploadChange}
              showProductSearch={showProductSearch}
              customerType={customerType}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <ImageBlockControls
                imageUrl={resolveSingleImageUrl(block, products)}
                altText={block.altText}
                alignment={block.alignment ?? "center"}
                size={block.size ?? "fuld"}
                onImageChange={onImageChange}
                onAltTextChange={onAltTextChange}
                onAlignmentChange={onAlignmentChange}
                onSizeChange={onSizeChange}
                caption={
                  // Et valgt produkts billede viser produktets eget navn/pris –
                  // kun et uploadet billede får egne felter.
                  block.imageUrl && !getSingleImageProduct(block, products)
                    ? {
                        title: block.imageTitle,
                        price: block.imagePrice,
                        onTitleChange: onImageTitleChange,
                        onPriceChange: onImagePriceChange,
                      }
                    : undefined
                }
              />
              <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3">
                <span className="font-jetbrains text-xs font-bold tracking-wider text-neutral-800 uppercase">
                  Eller vælg billede fra et produkt
                </span>
                <SearchableProductChecklist
                  products={products.filter((product) => product.hasImage)}
                  selectedProductIds={block.galleryProductIds ?? []}
                  onToggle={onImageProductSelect}
                  showSearch={showProductSearch}
                  searchPlaceholder={`Søg blandt de ${products.length} produkter...`}
                  customerType={customerType}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 border-t border-neutral-200 pt-3 @lg:grid-cols-2">
          {/* Kant-form gælder kun kortene – tekstlisten har ingen kort. */}
          {showImage && (
            <div className="flex flex-col gap-1.5">
              <span className={labelClassName}>Kant-form:</span>
              <SegmentedButtons
                value={block.productBorderRadius ?? "afrundet"}
                onChange={onProductBorderRadiusChange}
                options={CTA_BORDER_RADIUS_OPTIONS}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className={labelClassName}>Tæthed:</span>
            <SegmentedButtons
              options={PRODUCT_DENSITY_OPTIONS}
              value={block.productDensity ?? "normal"}
              onChange={onProductDensityChange}
            />
          </div>
          </div>
        </div>
      );
    }

    case "produkt":
      return (
        <select
          value={block.productId ?? ""}
          onChange={(event) => onProductIdChange(event.target.value)}
          className={fieldClassName}
        >
          {products.length === 0 && <option value="">Ingen produkter valgt</option>}
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      );

    case "billedeblok":
      return (
        <MasonryBlockControls
          images={block.masonryImages ?? []}
          layout={getMasonryLayout(block)}
          columns={getMasonryColumns(block)}
          gap={block.masonryGap ?? "lille"}
          radius={block.masonryRadius ?? "skarp"}
          onImagesChange={onMasonryImagesChange}
          onLayoutChange={onMasonryLayoutChange}
          onColumnsChange={(masonryColumns: MasonryColumns) => onMasonryPatch({ masonryColumns })}
          onGapChange={(masonryGap: MasonryGap) => onMasonryPatch({ masonryGap })}
          onRadiusChange={(masonryRadius) => onMasonryPatch({ masonryRadius })}
        />
      );

    case "socials": {
      const hasLinks = getSocialLinks(block).length > 0;
      const isOutline = (block.ctaStyle ?? "udfyldt") === "kontur";
      return (
        <div className="flex flex-col gap-4">
          {/* Forhåndsvisning – samme rendering som i nyhedsbrevet (SocialButtons). */}
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Forhåndsvisning:</span>
            <div className="border border-neutral-200 bg-white px-3 py-4" aria-hidden>
              {hasLinks ? (
                <SocialButtons block={block} asLinks={false} />
              ) : (
                <p className="text-center font-jetbrains text-[11px] text-neutral-400 italic">
                  Udfyld mindst ét link herunder
                </p>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className={labelClassName}>Overskrift (valgfri):</span>
            <input
              value={block.socialHeading ?? ""}
              onChange={(event) => onSocialsPatch({ socialHeading: event.target.value })}
              placeholder="F.eks. Følg os"
              className={fieldClassName}
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelClassName} mb-1`}>
              Links – kun udfyldte vises i nyhedsbrevet:
            </legend>
            {SOCIAL_PLATFORMS.map((platform) => (
              <label key={platform.id} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
                <span className="font-jetbrains text-xs text-neutral-800">{platform.label}</span>
                <input
                  type="url"
                  inputMode="url"
                  value={block.socialLinks?.[platform.id] ?? ""}
                  onChange={(event) =>
                    onSocialsPatch({ socialLinks: { ...block.socialLinks, [platform.id]: event.target.value } })
                  }
                  placeholder={platform.example}
                  aria-label={`Link til ${platform.label}`}
                  className={fieldClassName}
                />
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
            <ColorSwatches label="Knapfarve" value={block.bgColor} onChange={onBgColorChange} />
            {isOutline ? (
              <p className="font-jetbrains text-[11px] text-neutral-400">
                I kontur-stil bruges knapfarven til både kant og tekst.
              </p>
            ) : (
              <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} autoOption />
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className={labelClassName}>Form:</span>
              <SegmentedButtons
                options={CTA_BORDER_RADIUS_OPTIONS}
                value={block.ctaBorderRadius ?? "pille"}
                onChange={onCtaBorderRadiusChange}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClassName}>Stil:</span>
              <SegmentedButtons options={CTA_STYLE_OPTIONS} value={block.ctaStyle ?? "udfyldt"} onChange={onCtaStyleChange} />
            </div>
          </div>
        </div>
      );
    }

    case "skillelinje":
      return (
        <div className="flex items-center justify-between gap-4">
          <p className={helpTextClassName}>Visuel luft mellem indhold og knappen.</p>
          <span className="h-px w-24 shrink-0 bg-black" aria-hidden />
        </div>
      );

    case "cta":
      return (
        <div className="flex flex-col gap-4">
          {/* Lille forhåndsvisning af selve knappen – PRÆCIS samme rendering
              som i nyhedsbrevet (CtaButton), ligesom header/footer har deres
              egen forhåndsvisning. Øverst, så den kan ses, mens der rettes i
              farver, padding, form og stil herunder. */}
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Forhåndsvisning:</span>
            <div className="flex justify-center border border-neutral-200 bg-white px-3 py-4" aria-hidden>
              <CtaButton block={block} asLink={false} />
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelClassName}>Destinationslink:</span>
            <input
              value={block.ctaUrl ?? ""}
              onChange={(event) => onCtaUrlChange(event.target.value)}
              placeholder="F.eks. https://jyskplantesalg.dk/collections/frugttraeer"
              className={fieldClassName}
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Knaptekst:</span>
            <TextBlockEditor
              content={block.content ?? ""}
              onChange={onContentChange}
              fontFamily={block.fontFamily}
              fontSize={block.fontSize}
              textColor={block.textColor}
              onFontFamilyChange={onFontFamilyChange}
              onFontSizeChange={onFontSizeChange}
              showColorPicker={false}
              placeholder={block.placeholder}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
            <ColorSwatches label="Knapfarve" value={block.bgColor} onChange={onBgColorChange} />
            {(block.ctaStyle ?? "udfyldt") === "kontur" ? (
              <p className="font-jetbrains text-[11px] text-neutral-400">
                I kontur-stil bruges knapfarven til både kant og tekst.
              </p>
            ) : (
              <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
            )}
          </div>

          <CtaAdvancedControls
            block={block}
            onCtaPaddingChange={onCtaPaddingChange}
            onCtaBorderRadiusChange={onCtaBorderRadiusChange}
            onCtaStyleChange={onCtaStyleChange}
          />
        </div>
      );

    case "footer":
      return (
        <div className="flex flex-col gap-3">
          <p className={helpTextClassName}>Adresse, CVR og afmeldingslink – vises fast nederst.</p>
          <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
            <ColorSwatches label="Baggrund" value={block.bgColor} onChange={onBgColorChange} />
            <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} autoOption />
          </div>
          {/* Lille forhåndsvisning af footerens farver og firmaoplysninger –
              samme regel som NewsletterCard. */}
          <div
            className="space-y-1 border border-neutral-200 p-3 text-center font-jetbrains text-[11px]"
            style={{ backgroundColor: footerBgColor, color: block.textColor || getContrastTextColor(footerBgColor) }}
          >
            <p className="font-bold">{formatFooterAddressLine(brand) || "Ingen firmaoplysninger udfyldt"}</p>
            <p className="opacity-80">Du modtager dette nyhedsbrev … · Afmeld nyhedsbrevet</p>
          </div>
        </div>
      );
  }
}

// Blokkens tre handlinger (duplikér/skjul/slet) – samme knapper i den
// kompakte blokliste og i den valgte bloks panel-header.
function BlockActions({
  block,
  title,
  onDuplicate,
  onToggleHidden,
  onDelete,
}: {
  block: NewsletterBlock;
  title: string;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const iconButtonClassName =
    "flex h-7 w-7 items-center justify-center text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-2 focus-visible:outline-black";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onDuplicate}
        aria-label={`Dupliker blokken ${title}`}
        title="Duplikér blok"
        className={iconButtonClassName}
      >
        <DuplicateIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggleHidden}
        aria-label={block.hidden ? `Vis blokken ${title}` : `Skjul blokken ${title}`}
        aria-pressed={block.hidden}
        title={block.hidden ? "Vis blok" : "Skjul blok"}
        className={iconButtonClassName}
      >
        {block.hidden ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Slet blokken ${title}`}
        title="Slet blok"
        className="flex h-7 w-7 items-center justify-center text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-black"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function blockLabel(number: number, title: string, subtitle?: string) {
  return (
    <>
      {String(number).padStart(2, "0")}. {title}
      {subtitle && <span className="font-normal text-neutral-500">{` // ${subtitle}`}</span>}
    </>
  );
}

// Én række i sidepanelets kompakte blokliste (når ingen blok er valgt):
// træk-håndtag (dnd-kit), blokkens navn som knap, der vælger blokken, og
// duplikér/skjul/slet.
function SortableBlockRow({
  block,
  number,
  title,
  subtitle,
  badge,
  onSelect,
  onDuplicate,
  onToggleHidden,
  onDelete,
}: {
  block: NewsletterBlock;
  // Blokkens position i nyhedsbrevet (1-baseret) – vises som "01.".
  number: number;
  title: string;
  subtitle?: string;
  badge: BlockBadge;
  onSelect: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-2 border border-neutral-300 bg-white px-2 py-1.5 transition-shadow hover:border-black ${
        isDragging ? "shadow-lg" : ""
      } ${block.hidden ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Flyt blokken ${title}`}
          title="Træk for at flytte blokken op/ned"
          className="shrink-0 cursor-grab touch-none p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-black focus-visible:outline-2 focus-visible:outline-black active:cursor-grabbing"
        >
          <GripIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          id={`block-row-${block.id}`}
          onClick={onSelect}
          aria-label={`Rediger blokken ${title}${block.hidden ? " (skjult)" : ""}`}
          className="min-w-0 flex-1 truncate py-1 text-left font-jetbrains text-xs font-bold tracking-wider text-neutral-900 uppercase hover:underline focus-visible:outline-2 focus-visible:outline-black"
        >
          {blockLabel(number, title, subtitle)}
        </button>
        <Badge type={badge} />
      </div>
      <BlockActions
        block={block}
        title={title}
        onDuplicate={onDuplicate}
        onToggleHidden={onToggleHidden}
        onDelete={onDelete}
      />
    </li>
  );
}

// "+ Tilføj ny sektion": alle blok-typer, der kan tilføjes, som knapper på
// én gang (samme valg og samme handling som den tidligere dropdown).
function AddBlockMenu({ onAdd }: { onAdd: (kind: AddableBlockKind) => void }) {
  return (
    <div className="border-2 border-dashed border-neutral-400 bg-white p-4 text-center transition-colors hover:border-black">
      <p className="mb-2.5 flex items-center justify-center gap-1.5 font-jetbrains text-xs font-bold tracking-wider text-neutral-800 uppercase">
        <PlusIcon className="h-3 w-3" />
        Tilføj ny sektion til nyhedsbrevet
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ADD_BLOCK_OPTIONS.map(({ kind, label, description, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onAdd(kind)}
            title={description}
            className="flex items-center gap-1.5 border border-neutral-300 bg-neutral-50 px-3 py-1.5 font-jetbrains text-xs text-neutral-800 transition-colors hover:border-black hover:bg-black hover:text-white"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />+ {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Samler UNIONEN af alle produkter, der aktuelt vises på tværs af ALLE
// Billede-/Galleri-blokke (den ene, samlede blok-type med produkter), som
// CTA-linket skal afspejle – i stedet for kun den blok, brugeren senest
// redigerede. Uden dette ville CTA-linket blive et rent "sidst redigerede blok
// vinder"-kapløb, når nyhedsbrevet har flere billede-/galleri-blokke.
//
// "Vis billede" (showImage) påvirker BEVIDST ikke unionen: slået fra vises de
// samme produkter blot som tekstliste med klikbare navne – de er stadig en
// del af nyhedsbrevet.
//
// galleryProductIds er, ved ALLE layouts (se newsletterBlocks.ts), de(t)
// produkt(er), blokken rent faktisk viser – ved layout "1" enten 0 eller 1 id
// (fra søgevalg). Et manuelt UPLOADET billede har intet bagvedliggende
// produkt-id og bidrager derfor bevidst intet til unionen (der er ingen
// produkt-URL at hente). Et urørt/tomt galleryProductIds bidrager ligeledes
// naturligt intet – der er ingen "tom = vis alle"-tilstand.
function collectCtaRelevantProducts(blocks: NewsletterBlock[], products: ShopifyProduct[]): ShopifyProduct[] {
  const relevantIds = new Set<string>();
  for (const block of blocks) {
    if (block.type === "billede" || block.type === "img" || block.type === "galleri") {
      for (const id of block.galleryProductIds ?? []) relevantIds.add(id);
    }
  }
  return products.filter((product) => relevantIds.has(product.id));
}

// Fast, simpel ental-tekst, når CTA-unionen er indsnævret til ét enkelt
// produkt (se applyCtaLinkUpdate herunder) – IKKE en ny AI-generering, blot
// en statisk, altid-korrekt formulering, der matcher at linket nu peger på
// ÉT produkts egen side.
const SINGLE_PRODUCT_CTA_TEXT = "Se produktet her";

// CTA-linket OG -teksten genberegnes LØBENDE (ikke kun ved selve
// genereringen), hver gang produktvalget i en billede-/
// galleri-blok ændres i Edit-mode – samme centrale resolveCtaLink()-
// funktion som generate-newsletter/route.ts selv bruger ved den initiale
// generering (se src/lib/ctaLink.ts), men nu udregnet ud fra UNIONEN af alle
// relevante blokkes produktvalg (se collectCtaRelevantProducts ovenfor),
// ikke kun den blok, der udløste selve ændringen. Opdaterer ALLE cta-blokke
// i nyhedsbrevet (typisk kun én). Er unionen tom (fx brugeren har fravalgt
// alt i alle billede-/galleri-blokke), er der intet meningsfuldt at
// pege på – CTA-blokken røres da slet ikke, i stedet for at pege på/omtale
// et tomt/ugyldigt produkt.
//
// Teksten (content) følger samme "1 vs. flere"-skel som linket: ved PRÆCIS
// ét produkt i unionen bruges SINGLE_PRODUCT_CTA_TEXT (entalsformulering,
// matcher at linket nu peger på ét produkts egen side); ved flere end ét
// genindsættes blokkens EGET, gemte originalCtaText (AI'ens oprindelige,
// varierede flertalsformulering fra selve genereringen – se
// newsletterBlocks.ts), i stedet for at bede AI'en generere en ny tekst.
// Mangler originalCtaText (fx en CTA-blok tilføjet manuelt via "+ Tilføj
// blok", som aldrig havde AI-tekst), bevares blokkens nuværende content
// uændret, i stedet for at rydde den.
function applyCtaLinkUpdate(
  currentBlocks: NewsletterBlock[],
  products: ShopifyProduct[],
  topicSearchTerm: string | null,
): NewsletterBlock[] {
  const effectiveProducts = collectCtaRelevantProducts(currentBlocks, products);
  if (effectiveProducts.length === 0) return currentBlocks;
  const ctaUrl = resolveCtaLink(effectiveProducts, topicSearchTerm);
  return currentBlocks.map((block) => {
    if (block.type !== "cta") return block;
    const content = effectiveProducts.length === 1 ? SINGLE_PRODUCT_CTA_TEXT : (block.originalCtaText ?? block.content);
    return { ...block, ctaUrl, content };
  });
}

interface EditorBlockListProps {
  blocks: NewsletterBlock[];
  onBlocksChange: (next: NewsletterBlock[]) => void;
  products: ShopifyProduct[];
  // HELE det matchede produkt-sæt fra en emne-søgning – null ved
  // almindeligt manuelt produktvalg, se preview/page.tsx og
  // NewsletterContext.topicMatchedProductIds.
  topicMatchedProductIds: string[] | null;
  // Selve emne-ordet, der producerede det nuværende resultat – null ved
  // almindeligt manuelt produktvalg, se preview/page.tsx og
  // NewsletterContext.topicSearchTerm. Bruges til at genberegne
  // resolveCtaLink()'s søgeside-fallback (se applyCtaLinkUpdate ovenfor) OG
  // som (valgfri) kategori-kontekst ved "Regenerér tekst" (se
  // handleRegenerateText herunder).
  topicSearchTerm: string | null;
  // Målgruppen, det nuværende nyhedsbrev blev genereret til – bruges KUN af
  // "Regenerér tekst" (se handleRegenerateText herunder), til at bygge
  // PRÆCIS samme prompt-kontekst (pris inkl./ekskl. moms, tone) som selve
  // genereringen, og til at genopbygge Brødtekst-blokkens hilsen korrekt
  // (se buildBodyTextHtml).
  customerType: CustomerType;
  // Opsætnings-sidens samlede tekstfelt, som det så ud ved selve
  // genereringen (NewsletterContext.instructions) – bruges KUN af
  // "Regenerér tekst" til at give AI'en samme tone-/fokus-instruks som
  // oprindeligt, uden at det ellers påvirker noget i selve editoren.
  instructions: string;
  // Den blok, sidepanelet viser kontroller for (null = vis bloklisten).
  // Styres af preview-siden, så et klik på en blok i selve nyhedsbrevet og
  // et klik i listen her vælger den samme blok.
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  // Ekstra indhold nederst i bloklisten (fx preview-sidens inspektør).
  listFooter?: React.ReactNode;
}

// Blokkens visningsnavn – bruges også af preview-siden til nyhedsbrevets
// klikbare blokke (aria-label).
export function getBlockTitle(type: BlockType): string {
  return BLOCK_META[type].title;
}

export function EditorBlockList({
  blocks,
  onBlocksChange,
  products,
  topicMatchedProductIds,
  topicSearchTerm,
  customerType,
  instructions,
  selectedBlockId,
  onSelectBlock,
  listFooter,
}: EditorBlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [regenerateTextError, setRegenerateTextError] = useState<string | null>(null);

  // Samme union af "aktuelt viste" produkter, CTA-linket allerede
  // genberegnes ud fra (se collectCtaRelevantProducts/applyCtaLinkUpdate
  // ovenfor) – IKKE de oprindelige seed-produkter fra selve genereringen.
  // Tom, hvis brugeren har fravalgt alt i alle Billede/
  // Galleri – "Regenerér tekst"-knappen deaktiveres da (se JSX herunder),
  // ligesom CTA-linket i så fald heller ikke opdateres.
  const regenerateTextProducts = collectCtaRelevantProducts(blocks, products);

  // Kalder /api/regenerate-text med UNIONEN af aktuelt viste produkter
  // (regenerateTextProducts ovenfor) og opdaterer KUN Overskrift-/
  // Brødtekst-blokkenes content med svaret – rører bevidst intet andet
  // (blok-struktur, styling, billeder, CTA, som allerede er korrekt
  // dynamisk, se applyCtaLinkUpdate). Samme prompt-opbygning som selve
  // genereringen (buildNewsletterUserPrompt via regenerate-text/route.ts),
  // men image/cta i AI-svaret ignoreres helt – kun heading/bodyText bruges.
  async function handleRegenerateText() {
    if (regenerateTextProducts.length === 0 || isRegeneratingText) return;
    setIsRegeneratingText(true);
    setRegenerateTextError(null);
    try {
      const response = await fetch("/api/regenerate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType,
          instructions,
          productIds: regenerateTextProducts.map((product) => product.id),
          topicSearchTerm,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Kunne ikke regenerere teksten. Prøv igen.");
      }
      const { heading, bodyText } = await response.json();
      onBlocksChange(
        blocks.map((block) => {
          if (block.type === "overskrift") return { ...block, content: heading };
          if (block.type === "brodtekst") return { ...block, content: buildBodyTextHtml(customerType, bodyText) };
          return block;
        }),
      );
    } catch (err) {
      setRegenerateTextError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsRegeneratingText(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
  }

  function handleContentChange(id: string, html: string) {
    onBlocksChange(
      blocks.map((block) => {
        if (block.id !== id) return block;
        // Alle rich-text-blokkes per-udsnit farve-værktøj er skjult (se
        // showColorPicker i BlockContent herunder), men en inline farve kan i
        // princippet stadig snige sig ind via indsat/limet HTML – renses
        // derfor altid væk her, så block.textColor forbliver den ENESTE
        // kilde til blokkens tekstfarve. Uden dette ville en sådan inline
        // farve kunne vise noget andet end block.textColor i Preview, og
        // forsvinde usynligt igen næste gang blokkens tekst regenereres
        // (almindelig gentagen generering ELLER en skabelon) – det var
        // netop den fejl, der ramte "Gem som skabelon". Samme begrundelse
        // gælder nu font-family/font-size (se stripFontFamilyStyles/
        // stripFontSizeStyles) – begge er BLOK-niveau-felter (block.
        // fontFamily/block.fontSize), ikke et Tiptap-mærke i selve
        // content-HTML'en.
        const content = RICH_TEXT_BLOCK_TYPES.includes(block.type)
          ? stripFontSizeStyles(stripFontFamilyStyles(stripColorStyles(html)))
          : html;
        return { ...block, content };
      }),
    );
  }

  function handleCtaUrlChange(id: string, url: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ctaUrl: url } : block)));
  }

  function handleProductIdChange(id: string, productId: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, productId } : block)));
  }

  function handleImageChange(id: string, imageUrl: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, imageUrl } : block)));
  }

  function handleAltTextChange(id: string, altText: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, altText } : block)));
  }

  function handleImageTitleChange(id: string, imageTitle: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, imageTitle } : block)));
  }

  function handleImagePriceChange(id: string, imagePrice: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, imagePrice } : block)));
  }

  function handleAlignmentChange(id: string, alignment: ImageAlignment) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, alignment } : block)));
  }

  function handleSizeChange(id: string, size: ImageSize) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, size } : block)));
  }

  function handleBgColorChange(id: string, bgColor: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, bgColor } : block)));
  }

  // Sætter block.textColor DIREKTE for netop denne blok – til forskel fra
  // handleGlobalColorChange (som sætter samme felt på ALLE tekst-blokke på én
  // gang). Dette er blokkens EGEN, uafhængige tekstfarve-vælger (Overskrift/
  // Brødtekst/Tekst/CTA); ved at skrive til block.textColor (i stedet for et
  // per-udsnit Tiptap-mærke inde i selve content-HTML'en) overlever valget
  // både almindelig gentagen generering OG "Gem som skabelon" – content
  // regenereres frisk hver gang, men textColor gør ikke.
  function handleTextColorChange(id: string, textColor: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, textColor } : block)));
  }

  // Sætter block.fontFamily/block.fontSize for netop DENNE blok, kaldt fra
  // TextBlockEditor.tsx's egen per-blok værktøjslinje – samme mønster som
  // handleTextColorChange ovenfor. Gælder HELE blokkens indhold med det
  // samme; kræver ingen tekst-markering.
  function handleBlockFontFamilyChange(id: string, fontFamily: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, fontFamily } : block)));
  }

  function handleBlockFontSizeChange(id: string, fontSize: number) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, fontSize } : block)));
  }

  function handleCtaPaddingChange(id: string, ctaPadding: CtaPadding) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ctaPadding } : block)));
  }

  function handleCtaBorderRadiusChange(id: string, ctaBorderRadius: CtaBorderRadius) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ctaBorderRadius } : block)));
  }

  function handleCtaStyleChange(id: string, ctaStyle: CtaStyle) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ctaStyle } : block)));
  }

  function handleGalleryProductIdsChange(id: string, galleryProductIds: string[]) {
    onBlocksChange(
      applyCtaLinkUpdate(
        blocks.map((block) => (block.id === id ? { ...block, galleryProductIds } : block)),
        products,
        topicSearchTerm,
      ),
    );
  }

  // Skifter blokkens layout mellem "1 billede" og "2/3/6 billeder". Ved
  // skift TIL galleri-layout beskæres et evt. allerede valgt produkt-id-sæt
  // straks til det nye, lavere loft (samme regel, GalleryBlockControls
  // tidligere håndterede selv, nu flyttet hertil, da layout-valget er
  // flyttet op i det fælles kontrolpanel). Ved skift TIL "1 billede" bevares
  // højst ét tidligere valgt produkt-id (resten er irrelevante ved dette
  // layout) – og imageUrl/altText BACKFYLDES fra netop dét produkt, hvis
  // blokken (fx et auto-genereret galleri) aldrig selv havde dem sat, så
  // billed-forhåndsvisningen ikke bliver tom, mens produktvælgeren stadig
  // viser produktet som valgt. Har blokken allerede sin egen imageUrl (fra
  // upload ELLER et tidligere produktvalg), røres den slet ikke.
  function handleGalleryPerRowChange(id: string, galleryPerRow: number) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, galleryPerRow } : block)));
  }

  function handleGalleryColumnsChange(id: string, layout: MediaLayout) {
    const next = blocks.map((block) => {
      if (block.id !== id) return block;
      if (isGalleryLayout(layout)) {
        // Upload-pladser uden for det nye layout forsvinder; produkt-id'erne
        // beskæres til antallet af produkt-pladser, der er tilbage.
        const galleryUploads = (block.galleryUploads ?? []).slice(0, layout);
        const capacity = getGalleryProductSlotCount({ galleryColumns: layout, galleryUploads });
        return {
          ...block,
          galleryColumns: layout,
          galleryUploads,
          galleryProductIds: (block.galleryProductIds ?? []).slice(0, capacity),
        };
      }
      const keptProductId = block.galleryProductIds?.[0];
      const galleryProductIds = keptProductId ? [keptProductId] : block.galleryProductIds;
      if (block.imageUrl || !keptProductId) {
        return { ...block, galleryColumns: layout, galleryProductIds, galleryUploads: undefined };
      }
      const product = products.find((item) => item.id === keptProductId);
      return {
        ...block,
        galleryColumns: layout,
        galleryUploads: undefined,
        galleryProductIds,
        imageUrl: product?.imageUrl ?? block.imageUrl,
        altText: product?.title ?? block.altText,
      };
    });
    // Et layout-skift kan beskære galleryProductIds (fx 6->3 billeder) –
    // hvad blokken reelt viser ændrer sig derfor, og CTA-linket skal
    // genberegnes ud fra unionen af alle blokke, samme som ved et almindeligt
    // produktvalg (se applyCtaLinkUpdate).
    onBlocksChange(applyCtaLinkUpdate(next, products, topicSearchTerm));
  }

  // Galleri-layout: skifter plads `index` mellem "Vælg produkt" og "Upload
  // eget billede". Bliver en produkt-plads til upload, fjernes netop det
  // produkt, der stod på pladsen (de øvrige produkter bliver stående). Bliver
  // en upload-plads til produkt, fyldes den af næste valgte produkt – eller
  // står tom, til der vælges et i listen.
  function handleGallerySlotModeChange(id: string, index: number, mode: GallerySlotMode) {
    const next = blocks.map((block) => {
      if (block.id !== id) return block;
      const slot = getGallerySlots(block)[index];
      if (!slot || slot.kind === mode) return block;
      const galleryUploads = [...(block.galleryUploads ?? [])];
      let galleryProductIds = block.galleryProductIds ?? [];
      if (mode === "upload") {
        galleryUploads[index] = {};
        if (slot.kind === "product" && slot.productId) {
          galleryProductIds = galleryProductIds.filter((productId) => productId !== slot.productId);
        }
      } else {
        galleryUploads[index] = null;
      }
      return { ...block, galleryUploads, galleryProductIds };
    });
    // Et fjernet produkt ændrer, hvad galleriet viser – CTA-linket
    // genberegnes, samme som ved et almindeligt produktvalg.
    onBlocksChange(applyCtaLinkUpdate(next, products, topicSearchTerm));
  }

  function handleGallerySlotUploadChange(id: string, index: number, upload: GalleryUpload) {
    onBlocksChange(
      blocks.map((block) => {
        if (block.id !== id) return block;
        const galleryUploads = [...(block.galleryUploads ?? [])];
        galleryUploads[index] = upload;
        return { ...block, galleryUploads };
      }),
    );
  }

  // Kun relevant ved layout "1 billede" – vælger (eller fravælger, ved klik
  // på et allerede valgt produkt) billedet ud fra ét produkt via den
  // søgbare vælger, i stedet for manuel upload. Sætter imageUrl/altText
  // direkte fra produktet, så selve renderingen (NewsletterCard.tsx/
  // newsletterExport.ts) er UÆNDRET – den skelner ikke mellem et uploadet og
  // et produkt-valgt billede, kun om imageUrl er sat.
  function handleImageProductSelect(id: string, productId: string) {
    const currentBlock = blocks.find((block) => block.id === id);
    const isCurrentlySelected = currentBlock?.galleryProductIds?.[0] === productId;
    const product = products.find((item) => item.id === productId);
    const next = blocks.map((block) => {
      if (block.id !== id) return block;
      if (isCurrentlySelected) {
        return { ...block, galleryProductIds: [], imageUrl: undefined, altText: undefined };
      }
      return {
        ...block,
        galleryProductIds: [productId],
        imageUrl: product?.imageUrl,
        altText: product?.title,
      };
    });
    onBlocksChange(applyCtaLinkUpdate(next, products, topicSearchTerm));
  }

  // Slår "Vis billede" til/fra – skifter kun visningen (kort vs. tekstliste),
  // ikke produktvalget, så CTA-linket er uændret.
  function handleMasonryImagesChange(id: string, masonryImages: MasonryImage[]) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, masonryImages } : block)));
  }

  function handleMasonryPatch(
    id: string,
    patch: Pick<NewsletterBlock, "masonryColumns" | "masonryGap" | "masonryRadius">,
  ) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function handleSocialsPatch(id: string, patch: Pick<NewsletterBlock, "socialLinks" | "socialHeading">) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function handleMasonryLayoutChange(id: string, masonryLayout: MasonryLayout) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, masonryLayout } : block)));
  }

  function handleShowImageChange(id: string, showImage: boolean) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, showImage } : block)));
  }

  function handleProductBorderRadiusChange(id: string, productBorderRadius: CtaBorderRadius) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, productBorderRadius } : block)));
  }

  function handleProductDensityChange(id: string, productDensity: ProductListDensity) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, productDensity } : block)));
  }

  // Sætter skrifttypen for ALLE tekst-blokke på én gang og fjerner samtidig
  // evt. tidligere per-udsnit skrifttype-valg inde i selve indholdet (fra
  // værktøjslinjens egen Skrifttype-dropdown) – ellers ville et gammelt
  // individuelt valg blive ved med at overskygge det nye globale valg for
  // netop det tekstudsnit. Går man bagefter ind i en enkelt bloks egen
  // værktøjslinje og vælger en anden skrifttype dér, gælder det valg igen for
  // lige præcis den blok, indtil næste globale skift.
  function handleGlobalFontChange(fontFamily: string) {
    onBlocksChange(
      blocks.map((block) =>
        RICH_TEXT_BLOCK_TYPES.includes(block.type)
          ? { ...block, fontFamily, content: block.content ? stripFontFamilyStyles(block.content) : block.content }
          : block,
      ),
    );
  }

  // Samme mønster som handleGlobalFontChange, men for TEKSTFARVEN på de samme
  // blokke – for "cta" er det knap-tekstens farve, ikke knappens baggrund
  // (bgColor), som fortsat kun styres pr. blok via "Knapfarve"-swatchene
  // herunder.
  function handleGlobalColorChange(textColor: string) {
    onBlocksChange(
      blocks.map((block) =>
        RICH_TEXT_BLOCK_TYPES.includes(block.type)
          ? { ...block, textColor, content: block.content ? stripColorStyles(block.content) : block.content }
          : block,
      ),
    );
  }

  function handleDuplicate(id: string) {
    const index = blocks.findIndex((block) => block.id === id);
    if (index === -1) return;
    const copy = duplicateBlock(blocks[index]);
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onBlocksChange(next);
  }

  function handleToggleHidden(id: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, hidden: !block.hidden } : block)));
  }

  function handleDelete(id: string) {
    onBlocksChange(blocks.filter((block) => block.id !== id));
    // Den slettede blok kan ikke længere være valgt – tilbage til listen.
    if (id === selectedBlockId) onSelectBlock(null);
  }

  // Den nye blok vælges med det samme, så dens kontroller vises i panelet.
  function handleAddBlock(kind: AddableBlockKind) {
    const newBlock = createNewBlock(kind);
    onBlocksChange([...blocks, newBlock]);
    onSelectBlock(newBlock.id);
  }

  // Fokus-styring for tastatur/skærmlæser: når en blok vælges, flyttes
  // fokus til panelets overskrift (som annoncerer blokkens navn); når man går
  // tilbage til listen, får den netop forladte bloks række fokus igen.
  const selectedHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedBlockId) {
      selectedHeadingRef.current?.focus({ preventScroll: true });
    } else if (previousSelectedRef.current) {
      document.getElementById(`block-row-${previousSelectedRef.current}`)?.focus({ preventScroll: true });
    }
    previousSelectedRef.current = selectedBlockId;
  }, [selectedBlockId]);

  // Alle tekst-blokke sættes altid samlet af handleGlobalFontChange/
  // handleGlobalColorChange, så deres fontFamily/textColor-felter i praksis
  // er synkroniserede – vælgerne kan derfor bare aflæse værdien fra den
  // første tekst-blok, uden deres egen state.
  const firstTextBlock = blocks.find((block) => RICH_TEXT_BLOCK_TYPES.includes(block.type));
  const globalFontFamily = firstTextBlock?.fontFamily ?? "";
  const globalTextColor = firstTextBlock?.textColor;

  // Den valgte bloks kontroller – de eksisterende kontrol-komponenter
  // (BlockContent), uændret, blot vist i sidepanelet for én blok ad gangen.
  function renderBlockContent(block: NewsletterBlock) {
    return (
      <BlockContent
        block={block}
        onContentChange={(html) => handleContentChange(block.id, html)}
        onCtaUrlChange={(url) => handleCtaUrlChange(block.id, url)}
        onProductIdChange={(productId) => handleProductIdChange(block.id, productId)}
        onImageChange={(imageUrl) => handleImageChange(block.id, imageUrl)}
        onAltTextChange={(altText) => handleAltTextChange(block.id, altText)}
        onImageTitleChange={(imageTitle) => handleImageTitleChange(block.id, imageTitle)}
        onImagePriceChange={(imagePrice) => handleImagePriceChange(block.id, imagePrice)}
        onAlignmentChange={(alignment) => handleAlignmentChange(block.id, alignment)}
        onSizeChange={(size) => handleSizeChange(block.id, size)}
        onBgColorChange={(color) => handleBgColorChange(block.id, color)}
        onTextColorChange={(color) => handleTextColorChange(block.id, color)}
        onFontFamilyChange={(fontFamily) => handleBlockFontFamilyChange(block.id, fontFamily)}
        onFontSizeChange={(fontSize) => handleBlockFontSizeChange(block.id, fontSize)}
        onCtaPaddingChange={(padding) => handleCtaPaddingChange(block.id, padding)}
        onCtaBorderRadiusChange={(borderRadius) => handleCtaBorderRadiusChange(block.id, borderRadius)}
        onCtaStyleChange={(style) => handleCtaStyleChange(block.id, style)}
        onGalleryProductIdsChange={(productIds) => handleGalleryProductIdsChange(block.id, productIds)}
        onGalleryColumnsChange={(layout) => handleGalleryColumnsChange(block.id, layout)}
        onGalleryPerRowChange={(perRow) => handleGalleryPerRowChange(block.id, perRow)}
        onGallerySlotModeChange={(index, mode) => handleGallerySlotModeChange(block.id, index, mode)}
        onGallerySlotUploadChange={(index, upload) => handleGallerySlotUploadChange(block.id, index, upload)}
        onImageProductSelect={(productId) => handleImageProductSelect(block.id, productId)}
        onShowImageChange={(showImage) => handleShowImageChange(block.id, showImage)}
        onMasonryImagesChange={(images) => handleMasonryImagesChange(block.id, images)}
        onMasonryLayoutChange={(layout) => handleMasonryLayoutChange(block.id, layout)}
        onMasonryPatch={(patch) => handleMasonryPatch(block.id, patch)}
        onSocialsPatch={(patch) => handleSocialsPatch(block.id, patch)}
        onProductBorderRadiusChange={(borderRadius) => handleProductBorderRadiusChange(block.id, borderRadius)}
        onProductDensityChange={(density) => handleProductDensityChange(block.id, density)}
        products={products}
        topicMatchedProductIds={topicMatchedProductIds}
        customerType={customerType}
      />
    );
  }

  const selectedIndex = selectedBlockId ? blocks.findIndex((block) => block.id === selectedBlockId) : -1;
  const selectedBlock = selectedIndex >= 0 ? blocks[selectedIndex] : undefined;

  if (selectedBlock) {
    const meta = BLOCK_META[selectedBlock.type];
    return (
      <div
        className="@container flex w-full flex-col gap-4"
        onKeyDown={(event) => {
          // Escape lukker blokkens kontroller og går tilbage til listen.
          if (event.key === "Escape" && !event.defaultPrevented) onSelectBlock(null);
        }}
      >
        <button
          type="button"
          onClick={() => onSelectBlock(null)}
          className="inline-flex w-fit items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 font-jetbrains text-xs text-neutral-800 transition-colors hover:border-black focus-visible:outline-2 focus-visible:outline-black"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Alle blokke
        </button>
        <section
          aria-labelledby="selected-block-heading"
          className={`bg-white ${isMediaBlockType(selectedBlock.type) ? "border-2 border-black" : "border border-black"} ${
            selectedBlock.hidden ? "opacity-70" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-[#fafaf8] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2
                id="selected-block-heading"
                ref={selectedHeadingRef}
                tabIndex={-1}
                className="truncate font-jetbrains text-xs font-bold tracking-wider text-neutral-900 uppercase focus:outline-none"
              >
                {blockLabel(selectedIndex + 1, meta.title, meta.subtitle)}
              </h2>
              <Badge type={meta.badge} />
            </div>
            <BlockActions
              block={selectedBlock}
              title={meta.title}
              onDuplicate={() => handleDuplicate(selectedBlock.id)}
              onToggleHidden={() => handleToggleHidden(selectedBlock.id)}
              onDelete={() => handleDelete(selectedBlock.id)}
            />
          </div>
          {selectedBlock.hidden && (
            <p className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-jetbrains text-[11px] text-neutral-500">
              Blokken er skjult og vises ikke i nyhedsbrevet.
            </p>
          )}
          {/* key: kontrollerne monteres forfra ved skift til en anden blok
              (fx Tiptap-editorens indhold/placeholder og lokal UI-tilstand). */}
          <div key={selectedBlock.id} className="p-4">
            {renderBlockContent(selectedBlock)}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="@container flex w-full flex-col gap-4">
      {/* Typografi & farveprofil for hele nyhedsbrevet */}
      <section
        className="flex flex-wrap items-center justify-between gap-3 border border-neutral-300 bg-white p-3.5 font-jetbrains text-xs shadow-xs"
        title="Indstillinger for hele nyhedsbrevet"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] tracking-wider text-neutral-500 uppercase">
            <GearIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Typografi &amp; farveprofil:
          </span>
          <div className="relative flex items-center">
          <select
            id="global-font-family"
            value={globalFontFamily}
            onChange={(event) => handleGlobalFontChange(event.target.value)}
            aria-label="Skrifttype for hele nyhedsbrevet"
            style={{ fontFamily: globalFontFamily || undefined }}
            className="appearance-none rounded-none border border-neutral-300 bg-[#fbfbf9] py-1 pr-7 pl-3 text-xs text-neutral-900 focus:border-black focus:outline-none"
          >
            <option value="" disabled>
              Skrifttype
            </option>
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 h-2.5 w-2.5 text-neutral-500" />
          </div>
        </div>

        <div className="flex items-center gap-2" aria-label="Tekstfarve for hele nyhedsbrevet">
          <span className="text-[11px] text-neutral-400 uppercase">Global tekstfarve:</span>
          <div className="border border-neutral-200 bg-[#fbfbf9] p-1">
            <ColorSwatches value={globalTextColor} onChange={handleGlobalColorChange} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRegenerateText}
          disabled={regenerateTextProducts.length === 0 || isRegeneratingText}
          title="Genererer Overskrift og Brødtekst på ny, ud fra det/de produkter, der aktuelt er valgt i Billede & produktvisning-blokkene herunder – rører ikke ved blok-struktur, styling, billeder eller CTA-knappen."
          className="inline-flex w-fit items-center gap-1.5 self-start border border-neutral-400 bg-white px-3 py-1.5 font-jetbrains text-xs text-neutral-800 transition-all hover:border-black hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRegeneratingText ? (
            <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshIcon className="h-3.5 w-3.5" />
          )}
          {isRegeneratingText ? "Regenererer tekst..." : "Regenerér tekst ud fra det viste produkt"}
        </button>
        {regenerateTextError && <p className="font-jetbrains text-[12px] text-red-600">{regenerateTextError}</p>}
      </div>

      {/* Hjælpelinje til drag-and-drop + antal blokke */}
      <div className="flex items-center justify-between gap-3 border border-dashed border-neutral-400 bg-[#f0f0eb] px-3 py-1.5 font-jetbrains text-[11px] text-neutral-600">
        <span className="flex items-center gap-1.5 font-medium uppercase">
          <GripIcon className="h-3.5 w-3.5 shrink-0" />
          Træk i håndtagene for at ændre rækkefølgen af sektionerne
        </span>
        <span className="hidden shrink-0 text-neutral-500 @md:inline">
          {blocks.filter((block) => !block.hidden).length} blokke aktive · {blocks.filter((block) => block.hidden).length}{" "}
          skjult
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-1.5" aria-label="Nyhedsbrevets blokke">
            {blocks.map((block, index) => {
              const meta = BLOCK_META[block.type];
              return (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  number={index + 1}
                  title={meta.title}
                  subtitle={meta.subtitle}
                  badge={meta.badge}
                  onSelect={() => onSelectBlock(block.id)}
                  onDuplicate={() => handleDuplicate(block.id)}
                  onToggleHidden={() => handleToggleHidden(block.id)}
                  onDelete={() => handleDelete(block.id)}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>

      <AddBlockMenu onAdd={handleAddBlock} />

      {listFooter}
    </div>
  );
}
