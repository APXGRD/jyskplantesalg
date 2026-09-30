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
import { stripColorStyles } from "@/lib/brandColors";
import { FONT_FAMILIES, stripFontFamilyStyles, stripFontSizeStyles } from "@/lib/fontFamilies";
import {
  ButtonIcon,
  ChevronDownIcon,
  DividerIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  GearIcon,
  GripIcon,
  ImagePlaceholderIcon,
  PlusIcon,
  RefreshIcon,
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
  getGalleryArrangement,
  getMediaRowSize,
  isGalleryLayout,
  resolveSingleImageUrl,
  CTA_BORDER_RADIUS_PX,
  MEDIA_LAYOUT_OPTIONS,
  RICH_TEXT_BLOCK_TYPES,
  type AddableBlockKind,
  type BlockType,
  type CtaBorderRadius,
  type CtaPadding,
  type CtaStyle,
  type GalleryArrangement,
  type GalleryUpload,
  type MediaLayout,
  type ImageAlignment,
  type ImageSize,
  type NewsletterBlock,
  type ProductListDensity,
} from "@/lib/newsletterBlocks";
import { SearchableProductChecklist } from "@/components/SearchableProductChecklist";

type BlockBadge = "Struktur" | "AI-tekst" | "Produktdata";

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

const BLOCK_META: Record<BlockType, { title: string; badge: BlockBadge }> = {
  header: { title: "Header", badge: "Struktur" },
  overskrift: { title: "Overskrift", badge: "AI-tekst" },
  brodtekst: { title: "Brødtekst", badge: "AI-tekst" },
  billede: { title: MEDIA_BLOCK_TITLE, badge: "Produktdata" },
  skillelinje: { title: "Skillelinje", badge: "Struktur" },
  cta: { title: "Knap / CTA", badge: "AI-tekst" },
  footer: { title: "Footer", badge: "Struktur" },
  tekst: { title: "Tekst", badge: "AI-tekst" },
  img: { title: MEDIA_BLOCK_TITLE, badge: "Produktdata" },
  produkt: { title: "Produkt", badge: "Produktdata" },
  galleri: { title: MEDIA_BLOCK_TITLE, badge: "Produktdata" },
};

const ADD_BLOCK_OPTIONS: {
  kind: AddableBlockKind;
  label: string;
  description?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}[] = [
  { kind: "tekst", label: "Tekst", icon: TextIcon },
  { kind: "billede", label: MEDIA_BLOCK_TITLE, description: MEDIA_BLOCK_DESCRIPTION, icon: ImagePlaceholderIcon },
  { kind: "knap", label: "Knap", icon: ButtonIcon },
  { kind: "skillelinje", label: "Skillelinje", icon: DividerIcon },
];

const BADGE_STYLES: Record<BlockBadge, string> = {
  Struktur: "bg-surface-active text-ink",
  "AI-tekst": "bg-primary/10 text-secondary",
  Produktdata: "bg-surface-badge text-ink-muted",
};

function Badge({ type }: { type: BlockBadge }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${BADGE_STYLES[type]}`}
    >
      {type}
    </span>
  );
}

const fieldClassName =
  "w-full rounded-lg border border-border px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink-faintest";

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
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          title={option.label}
          className={`flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[10px] leading-none ${
            value === option.value ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
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
            <span key={index} className="h-2 w-2 rounded-[1px] bg-current opacity-70" />
          ))}
        </span>
      ))}
    </span>
  );
}

// Tekst til "Fordelt på flere rækker" for et givent antal, fx "2 + 2".
function describeGridRows(count: number): string {
  const perRow = getMediaRowSize({ galleryColumns: count as MediaLayout, galleryArrangement: "grid" });
  if (perRow === 1) return "Under hinanden";
  return `${perRow} + ${count - perRow}`;
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">Padding</span>
        <SegmentedButtons
          options={CTA_PADDING_OPTIONS}
          value={block.ctaPadding ?? "normal"}
          onChange={onCtaPaddingChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">Knap-form</span>
        <SegmentedButtons
          value={block.ctaBorderRadius ?? "afrundet"}
          onChange={onCtaBorderRadiusChange}
          options={CTA_BORDER_RADIUS_OPTIONS.map((option) => ({
            ...option,
            preview: (
              <span
                className="h-3 w-6 border border-current"
                style={{ borderRadius: CTA_BORDER_RADIUS_PX[option.value] }}
              />
            ),
          }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">Stil</span>
        <SegmentedButtons options={CTA_STYLE_OPTIONS} value={block.ctaStyle ?? "udfyldt"} onChange={onCtaStyleChange} />
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
  // Galleri-layout: alle billeder på én række eller fordelt på flere rækker.
  onGalleryArrangementChange: (arrangement: GalleryArrangement) => void;
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
  onGalleryArrangementChange,
  onGallerySlotModeChange,
  onGallerySlotUploadChange,
  onImageProductSelect,
  onShowImageChange,
  onProductBorderRadiusChange,
  onProductDensityChange,
  products,
  topicMatchedProductIds,
  customerType,
}: BlockContentProps) {
  switch (block.type) {
    case "header":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">Logo og butiksnavn – vises fast øverst i nyhedsbrevet.</p>
          <ColorSwatches label="Baggrund" value={block.bgColor} onChange={onBgColorChange} />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} autoOption />
        </div>
      );

    case "overskrift":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
          />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
        </div>
      );

    case "brodtekst":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
          />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
        </div>
      );

    case "tekst":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
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
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-muted">
            Vis billeder og produkter – vælg produkter (med navn, pris og link til produktets side) eller upload
            egne billeder.
          </p>
          <label className="relative flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-2.5 py-2">
            <span className="flex flex-col">
              <span className="text-xs font-medium text-ink">Vis billede</span>
              <span className="text-[11px] text-ink-muted">
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
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink-faintest ${
                showImage ? "bg-ink" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  showImage ? "translate-x-4" : ""
                }`}
              />
            </span>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">Antal billeder</span>
            <div className="flex gap-1">
              {MEDIA_LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onGalleryColumnsChange(option)}
                  aria-pressed={layout === option}
                  aria-label={option === 1 ? "1 billede" : `${option} billeder`}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] ${
                    layout === option ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
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
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">Placering</span>
              <SegmentedButtons
                value={getGalleryArrangement(block)}
                onChange={onGalleryArrangementChange}
                options={[
                  {
                    value: "row",
                    label: `Alle på én række (${layout})`,
                    preview: <ArrangementPreview count={layout} perRow={layout} />,
                  },
                  {
                    value: "grid",
                    label: `Flere rækker (${describeGridRows(layout)})`,
                    preview: (
                      <ArrangementPreview
                        count={layout}
                        perRow={getMediaRowSize({ galleryColumns: layout, galleryArrangement: "grid" })}
                      />
                    ),
                  },
                ]}
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
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-ink-muted">Eller vælg billede fra et produkt</span>
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

          {/* Kant-form gælder kun kortene – tekstlisten har ingen kort. */}
          {showImage && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">Kant-form</span>
              <SegmentedButtons
                value={block.productBorderRadius ?? "afrundet"}
                onChange={onProductBorderRadiusChange}
                options={CTA_BORDER_RADIUS_OPTIONS.map((option) => ({
                  ...option,
                  preview: (
                    <span
                      className="h-3 w-6 border border-current"
                      style={{ borderRadius: CTA_BORDER_RADIUS_PX[option.value] }}
                    />
                  ),
                }))}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">Tæthed</span>
            <SegmentedButtons
              options={PRODUCT_DENSITY_OPTIONS}
              value={block.productDensity ?? "normal"}
              onChange={onProductDensityChange}
            />
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

    case "skillelinje":
      return <p className="text-xs text-ink-muted">Visuel luft mellem indhold og knappen.</p>;

    case "cta":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            fontSize={block.fontSize}
            textColor={block.textColor}
            onFontFamilyChange={onFontFamilyChange}
            onFontSizeChange={onFontSizeChange}
            showColorPicker={false}
          />
          <input
            value={block.ctaUrl ?? ""}
            onChange={(event) => onCtaUrlChange(event.target.value)}
            placeholder="Link"
            className={fieldClassName}
          />
          <ColorSwatches label="Knapfarve" value={block.bgColor} onChange={onBgColorChange} />
          {(block.ctaStyle ?? "udfyldt") === "kontur" ? (
            <p className="text-[11px] text-ink-faintest">I kontur-stil bruges knapfarven til både kant og tekst.</p>
          ) : (
            <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} />
          )}

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
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">Adresse, CVR og afmeldingslink – vises fast nederst.</p>
          <ColorSwatches label="Baggrund" value={block.bgColor} onChange={onBgColorChange} />
          <ColorSwatches label="Tekstfarve" value={block.textColor} onChange={onTextColorChange} autoOption />
        </div>
      );
  }
}

function SortableBlockRow({
  block,
  title,
  badge,
  onDuplicate,
  onToggleHidden,
  onDelete,
  children,
}: {
  block: NewsletterBlock;
  title: string;
  badge: BlockBadge;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  children: React.ReactNode;
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
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-surface p-4 ${
        block.hidden ? "opacity-60 grayscale" : ""
      }`}
    >
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Flyt blokken ${title}`}
            className="cursor-grab touch-none rounded-md p-1 text-ink-faintest hover:bg-surface-active hover:text-ink-muted active:cursor-grabbing"
          >
            <GripIcon className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-ink">{title}</p>
        </div>

        <div className="flex items-center gap-1">
          <Badge type={badge} />

          <button
            type="button"
            onClick={onDuplicate}
            aria-label={`Dupliker blokken ${title}`}
            title="Dupliker"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faintest hover:bg-surface-active hover:text-ink-muted"
          >
            <DuplicateIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={block.hidden ? `Vis blokken ${title}` : `Skjul blokken ${title}`}
            aria-pressed={block.hidden}
            title={block.hidden ? "Vis" : "Skjul"}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faintest hover:bg-surface-active hover:text-ink-muted"
          >
            {block.hidden ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Slet blokken ${title}`}
            title="Slet"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faintest hover:bg-red-50 hover:text-red-600"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function AddBlockMenu({ onAdd }: { onAdd: (kind: AddableBlockKind) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(kind: AddableBlockKind) {
    onAdd(kind);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-[13px] font-medium text-ink-muted hover:border-ink-faintest hover:bg-surface-active hover:text-ink"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Tilføj blok
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {ADD_BLOCK_OPTIONS.map(({ kind, label, description, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => handleSelect(kind)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-active"
            >
              <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="flex flex-col">
                <span>{label}</span>
                {description && <span className="text-[11px] text-ink-muted">{description}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
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
}

export function EditorBlockList({
  blocks,
  onBlocksChange,
  products,
  topicMatchedProductIds,
  topicSearchTerm,
  customerType,
  instructions,
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
  function handleGalleryArrangementChange(id: string, galleryArrangement: GalleryArrangement) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, galleryArrangement } : block)));
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
  }

  function handleAddBlock(kind: AddableBlockKind) {
    onBlocksChange([...blocks, createNewBlock(kind)]);
  }

  // Alle tekst-blokke sættes altid samlet af handleGlobalFontChange/
  // handleGlobalColorChange, så deres fontFamily/textColor-felter i praksis
  // er synkroniserede – vælgerne kan derfor bare aflæse værdien fra den
  // første tekst-blok, uden deres egen state.
  const firstTextBlock = blocks.find((block) => RICH_TEXT_BLOCK_TYPES.includes(block.type));
  const globalFontFamily = firstTextBlock?.fontFamily ?? "";
  const globalTextColor = firstTextBlock?.textColor;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div
        className="flex h-11 w-fit shrink-0 items-center gap-1 self-start rounded-full border border-border bg-surface-active px-3 shadow-sm"
        title="Indstillinger for hele nyhedsbrevet"
      >
        <GearIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />

        <div className="mx-1 h-5 w-px bg-border" />

        <div className="relative flex items-center">
          <select
            id="global-font-family"
            value={globalFontFamily}
            onChange={(event) => handleGlobalFontChange(event.target.value)}
            aria-label="Skrifttype for hele nyhedsbrevet"
            className="appearance-none rounded-full bg-transparent py-1 pr-6 pl-2 text-xs text-ink-muted hover:bg-surface focus:outline-none"
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
          <ChevronDownIcon className="pointer-events-none absolute right-1.5 h-2.5 w-2.5 text-ink-muted" />
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <div aria-label="Tekstfarve for hele nyhedsbrevet">
          <ColorSwatches value={globalTextColor} onChange={handleGlobalColorChange} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRegenerateText}
          disabled={regenerateTextProducts.length === 0 || isRegeneratingText}
          title="Genererer Overskrift og Brødtekst på ny, ud fra det/de produkter, der aktuelt er valgt i Billede & produktvisning-blokkene herunder – rører ikke ved blok-struktur, styling, billeder eller CTA-knappen."
          className="inline-flex h-9 w-fit items-center gap-2 self-start rounded-full border border-border bg-surface px-3.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRegeneratingText ? (
            <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshIcon className="h-3.5 w-3.5" />
          )}
          {isRegeneratingText ? "Regenererer tekst..." : "Regenerér tekst ud fra det viste produkt"}
        </button>
        {regenerateTextError && <p className="text-[12px] text-red-600">{regenerateTextError}</p>}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {blocks.map((block) => {
              const meta = BLOCK_META[block.type];
              return (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  title={meta.title}
                  badge={meta.badge}
                  onDuplicate={() => handleDuplicate(block.id)}
                  onToggleHidden={() => handleToggleHidden(block.id)}
                  onDelete={() => handleDelete(block.id)}
                >
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
                    onGalleryArrangementChange={(arrangement) => handleGalleryArrangementChange(block.id, arrangement)}
                    onGallerySlotModeChange={(index, mode) => handleGallerySlotModeChange(block.id, index, mode)}
                    onGallerySlotUploadChange={(index, upload) => handleGallerySlotUploadChange(block.id, index, upload)}
                    onImageProductSelect={(productId) => handleImageProductSelect(block.id, productId)}
                    onShowImageChange={(showImage) => handleShowImageChange(block.id, showImage)}
                    onProductBorderRadiusChange={(borderRadius) => handleProductBorderRadiusChange(block.id, borderRadius)}
                    onProductDensityChange={(density) => handleProductDensityChange(block.id, density)}
                    products={products}
                    topicMatchedProductIds={topicMatchedProductIds}
                    customerType={customerType}
                  />
                </SortableBlockRow>
              );
            })}

            <AddBlockMenu onAdd={handleAddBlock} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
