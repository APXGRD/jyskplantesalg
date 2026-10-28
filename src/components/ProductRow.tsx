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
      className={`cursor-pointer border-b border-hairline transition-colors last:border-b-0 ${
        selected ? "bg-mint" : "hover:bg-cream/80"
      }`}
    >
      <td className="w-12 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(product.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 accent-forest"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-track text-stone">
            <ImagePlaceholderIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">{product.title}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-xs bg-track px-2 py-0.5 text-[11px] font-semibold tracking-wider text-stone-dark uppercase">
          {product.productType}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-ink-deep">
        {formatPrice(product.price)}
      </td>
    </tr>
  );
}
