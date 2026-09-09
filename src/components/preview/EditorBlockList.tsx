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
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { TextBlockEditor } from "@/components/TextBlockEditor";
import { ImageBlockControls } from "@/components/ImageBlockControls";
import { GalleryBlockControls } from "@/components/GalleryBlockControls";
import { ColorSwatches } from "@/components/ColorSwatches";
import { stripColorStyles } from "@/lib/brandColors";
import { FONT_FAMILIES, stripFontFamilyStyles } from "@/lib/fontFamilies";
import {
  ButtonIcon,
  ChevronDownIcon,
  DividerIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  GalleryIcon,
  GearIcon,
  GripIcon,
  ImagePlaceholderIcon,
  PlusIcon,
  ProductIcon,
  TextIcon,
  TrashIcon,
} from "@/components/icons";
import {
  createNewBlock,
  duplicateBlock,
  CTA_BORDER_RADIUS_PX,
  RICH_TEXT_BLOCK_TYPES,
  type AddableBlockKind,
  type BlockType,
  type CtaBorderRadius,
  type CtaPadding,
  type CtaStyle,
  type GalleryColumns,
  type ImageAlignment,
  type ImageSize,
  type NewsletterBlock,
} from "@/lib/newsletterBlocks";

type BlockBadge = "Struktur" | "AI-tekst" | "Produktdata";

const BLOCK_META: Record<BlockType, { title: string; badge: BlockBadge }> = {
  header: { title: "Header", badge: "Struktur" },
  overskrift: { title: "Overskrift", badge: "AI-tekst" },
  brodtekst: { title: "Brødtekst", badge: "AI-tekst" },
  billede: { title: "Billede", badge: "Produktdata" },
  produktvisning: { title: "Produktvisning", badge: "Produktdata" },
  skillelinje: { title: "Skillelinje", badge: "Struktur" },
  cta: { title: "Knap / CTA", badge: "AI-tekst" },
  footer: { title: "Footer", badge: "Struktur" },
  tekst: { title: "Tekst", badge: "AI-tekst" },
  img: { title: "Billede", badge: "Struktur" },
  produkt: { title: "Produkt", badge: "Produktdata" },
  galleri: { title: "Billedgalleri", badge: "Struktur" },
};

const ADD_BLOCK_OPTIONS: { kind: AddableBlockKind; label: string; icon: (props: { className?: string }) => React.JSX.Element }[] = [
  { kind: "tekst", label: "Tekst", icon: TextIcon },
  { kind: "billede", label: "Billede", icon: ImagePlaceholderIcon },
  { kind: "produkt", label: "Produkt", icon: ProductIcon },
  { kind: "knap", label: "Knap", icon: ButtonIcon },
  { kind: "skillelinje", label: "Skillelinje", icon: DividerIcon },
  { kind: "galleri", label: "Galleri", icon: GalleryIcon },
];

const BADGE_STYLES: Record<BlockBadge, string> = {
  Struktur: "bg-zinc-100 text-zinc-600",
  "AI-tekst": "bg-violet-50 text-violet-700",
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex items-center gap-1 self-start text-[11px] font-medium text-ink-muted hover:text-ink"
      >
        Flere indstillinger
        <span
          className="inline-flex"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }}
        >
          <ChevronDownIcon className="h-2.5 w-2.5" />
        </span>
      </button>

      {isOpen && (
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
      )}
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
  onAlignmentChange: (alignment: ImageAlignment) => void;
  onSizeChange: (size: ImageSize) => void;
  onBgColorChange: (color: string) => void;
  onCtaPaddingChange: (padding: CtaPadding) => void;
  onCtaBorderRadiusChange: (borderRadius: CtaBorderRadius) => void;
  onCtaStyleChange: (style: CtaStyle) => void;
  onGalleryProductIdsChange: (productIds: string[]) => void;
  onGalleryColumnsChange: (columns: GalleryColumns) => void;
  products: ShopifyProduct[];
  customerType: CustomerType;
}

function BlockContent({
  block,
  onContentChange,
  onCtaUrlChange,
  onProductIdChange,
  onImageChange,
  onAltTextChange,
  onAlignmentChange,
  onSizeChange,
  onBgColorChange,
  onCtaPaddingChange,
  onCtaBorderRadiusChange,
  onCtaStyleChange,
  onGalleryProductIdsChange,
  onGalleryColumnsChange,
  products,
  customerType,
}: BlockContentProps) {
  switch (block.type) {
    case "header":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">Logo og butiksnavn – vises fast øverst i nyhedsbrevet.</p>
          <ColorSwatches label="Baggrund" value={block.bgColor} onChange={onBgColorChange} />
        </div>
      );

    case "overskrift":
      return (
        <TextBlockEditor
          content={block.content ?? ""}
          onChange={onContentChange}
          fontFamily={block.fontFamily}
          textColor={block.textColor}
        />
      );

    case "brodtekst":
      return (
        <TextBlockEditor
          content={block.content ?? ""}
          onChange={onContentChange}
          fontFamily={block.fontFamily}
          textColor={block.textColor}
        />
      );

    case "tekst":
      return (
        <TextBlockEditor
          content={block.content ?? ""}
          onChange={onContentChange}
          fontFamily={block.fontFamily}
          textColor={block.textColor}
        />
      );

    case "billede":
    case "img":
      return (
        <ImageBlockControls
          imageUrl={block.imageUrl}
          altText={block.altText}
          alignment={block.alignment ?? "center"}
          size={block.size ?? "fuld"}
          onImageChange={onImageChange}
          onAltTextChange={onAltTextChange}
          onAlignmentChange={onAlignmentChange}
          onSizeChange={onSizeChange}
        />
      );

    case "produktvisning":
      return (
        <ul className="flex flex-col gap-1.5 text-xs">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between text-ink-muted">
              <span>{product.title}</span>
              <span className="font-medium text-ink">
                {formatPriceForCustomer(product.price, customerType)}
              </span>
            </li>
          ))}
        </ul>
      );

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

    case "galleri":
      return (
        <GalleryBlockControls
          products={products}
          selectedProductIds={block.galleryProductIds ?? []}
          columns={block.galleryColumns ?? 2}
          onProductIdsChange={onGalleryProductIdsChange}
          onColumnsChange={onGalleryColumnsChange}
        />
      );

    case "cta":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor
            content={block.content ?? ""}
            onChange={onContentChange}
            fontFamily={block.fontFamily}
            textColor={block.textColor}
          />
          <input
            value={block.ctaUrl ?? ""}
            onChange={(event) => onCtaUrlChange(event.target.value)}
            placeholder="Link"
            className={fieldClassName}
          />
          <ColorSwatches label="Knapfarve" value={block.bgColor} onChange={onBgColorChange} />

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
      className={`rounded-xl border border-border bg-white p-4 ${
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
        <div className="absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-lg border border-border bg-white py-1 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {ADD_BLOCK_OPTIONS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => handleSelect(kind)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-active"
            >
              <Icon className="h-4 w-4 text-ink-muted" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface EditorBlockListProps {
  blocks: NewsletterBlock[];
  onBlocksChange: (next: NewsletterBlock[]) => void;
  products: ShopifyProduct[];
  customerType: CustomerType;
}

export function EditorBlockList({ blocks, onBlocksChange, products, customerType }: EditorBlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
  }

  function handleContentChange(id: string, html: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, content: html } : block)));
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

  function handleAlignmentChange(id: string, alignment: ImageAlignment) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, alignment } : block)));
  }

  function handleSizeChange(id: string, size: ImageSize) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, size } : block)));
  }

  function handleBgColorChange(id: string, bgColor: string) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, bgColor } : block)));
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
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, galleryProductIds } : block)));
  }

  function handleGalleryColumnsChange(id: string, galleryColumns: GalleryColumns) {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, galleryColumns } : block)));
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
    onBlocksChange([...blocks, createNewBlock(kind, products[0]?.id)]);
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
                    onAlignmentChange={(alignment) => handleAlignmentChange(block.id, alignment)}
                    onSizeChange={(size) => handleSizeChange(block.id, size)}
                    onBgColorChange={(color) => handleBgColorChange(block.id, color)}
                    onCtaPaddingChange={(padding) => handleCtaPaddingChange(block.id, padding)}
                    onCtaBorderRadiusChange={(borderRadius) => handleCtaBorderRadiusChange(block.id, borderRadius)}
                    onCtaStyleChange={(style) => handleCtaStyleChange(block.id, style)}
                    onGalleryProductIdsChange={(productIds) => handleGalleryProductIdsChange(block.id, productIds)}
                    onGalleryColumnsChange={(columns) => handleGalleryColumnsChange(block.id, columns)}
                    products={products}
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
