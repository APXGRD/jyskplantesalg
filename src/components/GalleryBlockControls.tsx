"use client";

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import type { GalleryColumns } from "@/lib/newsletterBlocks";

const COLUMN_OPTIONS: { value: GalleryColumns; label: string }[] = [
  { value: 2, label: "2 kolonner" },
  { value: 3, label: "3 kolonner" },
  { value: 6, label: "6 billeder" },
];

interface GalleryBlockControlsProps {
  // De produkter, der allerede er valgt på "Vælg produkter"-siden – samme
  // liste som resten af nyhedsbrevet bruger. Ingen separat Shopify-hentning
  // her.
  products: ShopifyProduct[];
  selectedProductIds: string[];
  columns: GalleryColumns;
  onProductIdsChange: (productIds: string[]) => void;
  onColumnsChange: (columns: GalleryColumns) => void;
}

export function GalleryBlockControls({
  products,
  selectedProductIds,
  columns,
  onProductIdsChange,
  onColumnsChange,
}: GalleryBlockControlsProps) {
  // Et galleri uden billede er meningsløst (og giver et tomt src-attribut i
  // Preview/eksporten) – produkter uden billede kan derfor slet ikke vælges
  // her, samme regel som "kun med billede"-filteret på "Vælg produkter"-siden.
  const availableProducts = products.filter((product) => product.hasImage);
  const hasEnoughProducts = availableProducts.length >= columns;

  function toggleProduct(id: string) {
    if (selectedProductIds.includes(id)) {
      onProductIdsChange(selectedProductIds.filter((productId) => productId !== id));
      return;
    }
    // Layoutet (2/3 kolonner) sætter det faste loft for, hvor mange billeder
    // galleriet kan vise ad gangen – yderligere valg ignoreres i stedet for
    // at overskride det.
    if (selectedProductIds.length >= columns) return;
    onProductIdsChange([...selectedProductIds, id]);
  }

  function handleColumnsChange(next: GalleryColumns) {
    onColumnsChange(next);
    // Skiftes til færre kolonner end der allerede er valgt produkter til,
    // beskæres valget straks – ellers ville blokken bære på "usynlige" ekstra
    // valg, der ikke passer til det nye layout.
    if (selectedProductIds.length > next) {
      onProductIdsChange(selectedProductIds.slice(0, next));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">Layout</span>
        <div className="flex gap-1">
          {COLUMN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleColumnsChange(option.value)}
              aria-pressed={columns === option.value}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] ${
                columns === option.value ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!hasEnoughProducts ? (
        <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
          Du har kun valgt {availableProducts.length} {availableProducts.length === 1 ? "produkt" : "produkter"} med
          billede på &quot;Vælg produkter&quot;-siden – vælg mindst {columns} dér for at bruge dette layout.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-muted">
            Produkter i galleriet ({selectedProductIds.length}/{columns})
          </span>
          <div className="flex flex-col gap-0.5">
            {availableProducts.map((product) => {
              const checked = selectedProductIds.includes(product.id);
              const disabled = !checked && selectedProductIds.length >= columns;
              return (
                <label
                  key={product.id}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                    checked ? "bg-surface-active text-ink" : disabled ? "text-ink-faintest" : "text-ink-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleProduct(product.id)}
                  />
                  {product.title}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
