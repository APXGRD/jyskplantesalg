"use client";

import { useState } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { SearchIcon } from "@/components/icons";

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
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-none border border-neutral-300 bg-[#fdfdfb] py-2 pr-9 pl-3 font-jetbrains text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </div>
      )}
      <div
        className={`flex flex-col divide-y divide-neutral-200 border border-neutral-300 bg-white font-jetbrains text-xs ${
          showSearch ? "max-h-56 overflow-y-auto" : ""
        }`}
      >
        {visibleProducts.map((product) => {
          const checked = selectedProductIds.includes(product.id);
          const disabled = !checked && (isDisabled?.(product) ?? false);
          return (
            <label
              key={product.id}
              className={`flex items-center gap-2.5 px-3 py-2 ${
                checked
                  ? "cursor-pointer bg-neutral-100 font-medium text-neutral-900 hover:bg-neutral-200"
                  : disabled
                    ? "cursor-not-allowed text-neutral-300"
                    : "cursor-pointer text-neutral-600 hover:bg-[#fafaf8]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(product.id)}
                className="h-3.5 w-3.5 shrink-0 accent-black"
              />
              <span className="min-w-0 flex-1">{product.title}</span>
              <span className={`shrink-0 whitespace-nowrap tabular-nums ${checked ? "font-bold" : ""}`}>
                {formatPriceForCustomer(product.price, customerType)}
              </span>
            </label>
          );
        })}
        {showSearch && trimmedSearch && visibleProducts.length === 0 && (
          <p className="px-3 py-2 text-neutral-400">Ingen produkter matcher &quot;{search}&quot;.</p>
        )}
      </div>
    </>
  );
}
