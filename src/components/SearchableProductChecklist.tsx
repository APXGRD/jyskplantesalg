"use client";

import { useState } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";

// Delt af GalleryBlockControls.tsx (galleri-layout, med et fast loft på
// antal valgte) og "1 billede"-layoutets produktvalg (EditorBlockList.tsx) –
// selve søgefelt+afkrydsnings-listen er identisk begge steder, kun hvad der sker ved klik (onToggle) og evt.
// disabled-logik afgøres af kalderen.
interface SearchableProductChecklistProps {
  products: ShopifyProduct[];
  selectedProductIds: string[];
  onToggle: (id: string) => void;
  // Sat af kalderen for produkter, der ikke kan vælges lige nu (fx et fast
  // loft på antal) – et allerede VALGT produkt er aldrig disabled, uanset
  // denne funktion, så det altid kan fravælges igen.
  isDisabled?: (product: ShopifyProduct) => boolean;
  showSearch: boolean;
  searchPlaceholder: string;
  // Nyhedsbrevets målgruppe – prisen i hver række vises som i selve
  // nyhedsbrevet (inkl. moms for privat, ekskl. moms for erhverv).
  customerType: CustomerType;
}

export function SearchableProductChecklist({
  products,
  selectedProductIds,
  onToggle,
  isDisabled,
  showSearch,
  searchPlaceholder,
  customerType,
}: SearchableProductChecklistProps) {
  // Rent lokal UI-filtrering af selve VISNINGEN – påvirker ikke selve valget
  // (selectedProductIds), kun hvilke rækker der vises i listen, mens
  // brugeren søger.
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim().toLowerCase();
  const visibleProducts =
    showSearch && trimmedSearch
      ? products.filter((product) => product.title.toLowerCase().includes(trimmedSearch))
      : products;

  return (
    <>
      {showSearch && (
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-ink placeholder:text-ink-faintest focus:outline-none"
        />
      )}
      <div className={`flex flex-col gap-0.5 ${showSearch ? "max-h-56 overflow-y-auto" : ""}`}>
        {visibleProducts.map((product) => {
          const checked = selectedProductIds.includes(product.id);
          const disabled = !checked && (isDisabled?.(product) ?? false);
          return (
            <label
              key={product.id}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                checked ? "bg-surface-active text-ink" : disabled ? "text-ink-faintest" : "text-ink-muted"
              }`}
            >
              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(product.id)} />
              <span className="min-w-0 flex-1">{product.title}</span>
              <span className="shrink-0 font-medium whitespace-nowrap tabular-nums">
                {formatPriceForCustomer(product.price, customerType)}
              </span>
            </label>
          );
        })}
        {showSearch && trimmedSearch && visibleProducts.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-ink-faintest">Ingen produkter matcher &quot;{search}&quot;.</p>
        )}
      </div>
    </>
  );
}
