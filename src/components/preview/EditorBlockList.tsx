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
import {
  ButtonIcon,
  DividerIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
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
  type AddableBlockKind,
  type BlockType,
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
};

const ADD_BLOCK_OPTIONS: { kind: AddableBlockKind; label: string; icon: (props: { className?: string }) => React.JSX.Element }[] = [
  { kind: "tekst", label: "Tekst", icon: TextIcon },
  { kind: "billede", label: "Billede", icon: ImagePlaceholderIcon },
  { kind: "produkt", label: "Produkt", icon: ProductIcon },
  { kind: "knap", label: "Knap", icon: ButtonIcon },
  { kind: "skillelinje", label: "Skillelinje", icon: DividerIcon },
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

interface BlockContentProps {
  block: NewsletterBlock;
  onContentChange: (html: string) => void;
  onCtaUrlChange: (url: string) => void;
  onProductIdChange: (productId: string) => void;
  products: ShopifyProduct[];
  customerType: CustomerType;
}

function BlockContent({
  block,
  onContentChange,
  onCtaUrlChange,
  onProductIdChange,
  products,
  customerType,
}: BlockContentProps) {
  switch (block.type) {
    case "header":
      return <p className="text-xs text-ink-muted">Logo og butiksnavn – vises fast øverst i nyhedsbrevet.</p>;

    case "overskrift":
      return <TextBlockEditor content={block.content ?? ""} onChange={onContentChange} />;

    case "brodtekst":
      return <TextBlockEditor content={block.content ?? ""} onChange={onContentChange} />;

    case "tekst":
      return <TextBlockEditor content={block.content ?? ""} onChange={onContentChange} />;

    case "billede":
      return (
        <p className="text-xs text-ink-muted">
          Produktbillede – vises som pladsholder, indtil rigtige fotos er tilkoblet.
        </p>
      );

    case "img":
      return <p className="text-xs text-ink-muted">Tomt billede – ingen fil tilknyttet endnu.</p>;

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

    case "cta":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor content={block.content ?? ""} onChange={onContentChange} />
          <input
            value={block.ctaUrl ?? ""}
            onChange={(event) => onCtaUrlChange(event.target.value)}
            placeholder="Link"
            className={fieldClassName}
          />
        </div>
      );

    case "footer":
      return <p className="text-xs text-ink-muted">Adresse, CVR og afmeldingslink – vises fast nederst.</p>;
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
        <div className="flex max-w-xl flex-col gap-3">
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
  );
}
