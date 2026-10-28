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
    <div className="overflow-hidden rounded-xs border border-hairline bg-white">
      {/* overflow-x-auto på selve tabellen (ikke den ydre, lodret
          scrollende container) – på smalle skærme kan tabellen scrolle
          vandret for sig, i stedet for at klemme kolonnerne sammen eller
          bryde resten af sidens layout. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse">
          <thead className="bg-cream text-left text-[11px] font-semibold tracking-wider text-stone uppercase">
            <tr className="border-b border-hairline">
              <th className="w-12 px-4 py-3 font-semibold">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onSelectAllChange(event.target.checked)}
                  disabled={products.length === 0}
                  aria-label="Vælg alle"
                  className="h-4 w-4 accent-forest"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Produkt</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 text-right font-semibold">Pris</th>
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
      </div>

      {products.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-stone">
          Ingen produkter matcher dine filtre.
        </p>
      )}
    </div>
  );
}
