import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";

type BlockBadge = "Struktur" | "AI-tekst" | "Produktdata";

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

function BlockRow({
  title,
  badge,
  children,
}: {
  title: string;
  badge: BlockBadge;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between pb-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <Badge type={badge} />
      </div>
      {children}
    </div>
  );
}

const fieldClassName =
  "w-full rounded-lg border border-border px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink-faintest";

interface EditorBlockListProps {
  result: GeneratedNewsletter;
  onChange: (next: GeneratedNewsletter) => void;
  products: ShopifyProduct[];
  customerType: CustomerType;
}

export function EditorBlockList({ result, onChange, products, customerType }: EditorBlockListProps) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <BlockRow title="Header" badge="Struktur">
        <p className="text-xs text-ink-muted">Logo og butiksnavn – vises fast øverst i nyhedsbrevet.</p>
      </BlockRow>

      <BlockRow title="Overskrift" badge="AI-tekst">
        <input
          value={result.heading}
          onChange={(event) => onChange({ ...result, heading: event.target.value })}
          className={fieldClassName}
        />
      </BlockRow>

      <BlockRow title="Brødtekst" badge="AI-tekst">
        <textarea
          value={result.bodyText}
          onChange={(event) => onChange({ ...result, bodyText: event.target.value })}
          rows={4}
          className={`${fieldClassName} resize-none`}
        />
      </BlockRow>

      <BlockRow title="Billede" badge="Produktdata">
        <p className="text-xs text-ink-muted">{result.image.altText}</p>
      </BlockRow>

      <BlockRow title="Produktvisning" badge="Produktdata">
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
      </BlockRow>

      <BlockRow title="Skillelinje" badge="Struktur">
        <p className="text-xs text-ink-muted">Visuel luft mellem indhold og knappen.</p>
      </BlockRow>

      <BlockRow title="Knap / CTA" badge="AI-tekst">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={result.cta.text}
            onChange={(event) =>
              onChange({ ...result, cta: { ...result.cta, text: event.target.value } })
            }
            placeholder="Knaptekst"
            className={`${fieldClassName} sm:flex-1`}
          />
          <input
            value={result.cta.url}
            onChange={(event) =>
              onChange({ ...result, cta: { ...result.cta, url: event.target.value } })
            }
            placeholder="Link"
            className={`${fieldClassName} sm:flex-1`}
          />
        </div>
      </BlockRow>

      <BlockRow title="Footer" badge="Struktur">
        <p className="text-xs text-ink-muted">Adresse, CVR og afmeldingslink – vises fast nederst.</p>
      </BlockRow>
    </div>
  );
}
