"use client";

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
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import { TextBlockEditor } from "@/components/TextBlockEditor";
import { GripIcon } from "@/components/icons";
import type { BlockId } from "@/lib/newsletterBlocks";

type BlockBadge = "Struktur" | "AI-tekst" | "Produktdata";

interface BlockDef {
  id: BlockId;
  title: string;
  badge: BlockBadge;
}

const BLOCK_DEFS: BlockDef[] = [
  { id: "header", title: "Header", badge: "Struktur" },
  { id: "overskrift", title: "Overskrift", badge: "AI-tekst" },
  { id: "brodtekst", title: "Brødtekst", badge: "AI-tekst" },
  { id: "billede", title: "Billede", badge: "Produktdata" },
  { id: "produktvisning", title: "Produktvisning", badge: "Produktdata" },
  { id: "skillelinje", title: "Skillelinje", badge: "Struktur" },
  { id: "cta", title: "Knap / CTA", badge: "AI-tekst" },
  { id: "footer", title: "Footer", badge: "Struktur" },
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
  id: BlockId;
  result: GeneratedNewsletter;
  onChange: (next: GeneratedNewsletter) => void;
  products: ShopifyProduct[];
  customerType: CustomerType;
}

function BlockContent({ id, result, onChange, products, customerType }: BlockContentProps) {
  switch (id) {
    case "header":
      return <p className="text-xs text-ink-muted">Logo og butiksnavn – vises fast øverst i nyhedsbrevet.</p>;

    case "overskrift":
      return (
        <TextBlockEditor
          content={result.heading}
          onChange={(html) => onChange({ ...result, heading: html })}
        />
      );

    case "brodtekst":
      return (
        <TextBlockEditor
          content={result.bodyText}
          onChange={(html) => onChange({ ...result, bodyText: html })}
        />
      );

    case "billede":
      return <p className="text-xs text-ink-muted">{result.image.altText}</p>;

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

    case "skillelinje":
      return <p className="text-xs text-ink-muted">Visuel luft mellem indhold og knappen.</p>;

    case "cta":
      return (
        <div className="flex flex-col gap-2">
          <TextBlockEditor
            content={result.cta.text}
            onChange={(html) => onChange({ ...result, cta: { ...result.cta, text: html } })}
          />
          <input
            value={result.cta.url}
            onChange={(event) =>
              onChange({ ...result, cta: { ...result.cta, url: event.target.value } })
            }
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
  id,
  title,
  badge,
  children,
}: {
  id: BlockId;
  title: string;
  badge: BlockBadge;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-white p-4"
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
        <Badge type={badge} />
      </div>
      {children}
    </div>
  );
}

interface EditorBlockListProps {
  result: GeneratedNewsletter;
  onChange: (next: GeneratedNewsletter) => void;
  products: ShopifyProduct[];
  customerType: CustomerType;
  order: BlockId[];
  onReorder: (next: BlockId[]) => void;
}

export function EditorBlockList({
  result,
  onChange,
  products,
  customerType,
  order,
  onReorder,
}: EditorBlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(active.id as BlockId);
    const newIndex = order.indexOf(over.id as BlockId);
    onReorder(arrayMove(order, oldIndex, newIndex));
  }

  const blocksById = new Map(BLOCK_DEFS.map((block) => [block.id, block]));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex max-w-xl flex-col gap-3">
          {order.map((id) => {
            const block = blocksById.get(id);
            if (!block) return null;
            return (
              <SortableBlockRow key={id} id={id} title={block.title} badge={block.badge}>
                <BlockContent
                  id={id}
                  result={result}
                  onChange={onChange}
                  products={products}
                  customerType={customerType}
                />
              </SortableBlockRow>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
