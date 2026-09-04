"use client";

import { useEffect, useRef } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { ProductRow } from "./ProductRow";

interface ProductTableProps {
  products: ShopifyProduct[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAllChange: (checked: boolean) => void;
}

export function ProductTable({
  products,
  selectedIds,
  onToggle,
  onSelectAllChange,
}: ProductTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected =
    !allSelected && products.some((p) => selectedIds.has(p.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="flex-1 overflow-y-auto px-8">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-surface text-left text-[10px] font-semibold tracking-wider text-ink-faint uppercase">
          <tr className="border-b border-border">
            <th className="w-12 py-3 font-semibold">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onSelectAllChange(event.target.checked)}
                disabled={products.length === 0}
                aria-label="Vælg alle"
                className="h-3.5 w-3.5 rounded-sm border-zinc-400 accent-ink"
              />
            </th>
            <th className="py-3 font-semibold">Produkt</th>
            <th className="py-3 font-semibold">Type</th>
            <th className="py-3 text-right font-semibold">Pris</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              selected={selectedIds.has(product.id)}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>

      {products.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">
          Ingen produkter matcher dine filtre.
        </p>
      )}
    </div>
  );
}
