import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPrice } from "@/lib/format";
import { ImagePlaceholderIcon } from "./icons";

interface ProductRowProps {
  product: ShopifyProduct;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function ProductRow({ product, selected, onToggle }: ProductRowProps) {
  return (
    <tr
      onClick={() => onToggle(product.id)}
      className={`cursor-pointer border-b border-border last:border-b-0 ${
        selected ? "bg-surface-selected" : "hover:bg-surface-active/40"
      }`}
    >
      <td className="w-12 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(product.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-3.5 w-3.5 rounded-sm border-zinc-400 accent-ink"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-active text-ink-muted">
            <ImagePlaceholderIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-ink">{product.title}</p>
            <p className="text-xs text-ink-muted">{product.subtitle}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md bg-surface-badge px-2 py-1 text-[11px] font-medium text-ink-muted">
          {product.productType}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-[13px] font-medium text-ink">
        {formatPrice(product.price)}
      </td>
    </tr>
  );
}
