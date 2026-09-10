"use client";

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import type { GalleryColumns } from "@/lib/newsletterBlocks";
import { SearchableProductChecklist } from "./SearchableProductChecklist";

interface GalleryBlockControlsProps {
  // De produkter, der allerede er valgt på "Vælg produkter"-siden – samme
  // liste som resten af nyhedsbrevet bruger. Ingen separat Shopify-hentning
  // her.
  products: ShopifyProduct[];
  selectedProductIds: string[];
  // Layout-valget (2/3/6) vælges nu i det fælles Billede-/Galleri-panel, der
  // omslutter denne komponent (se den samlede "billede"-case i
  // EditorBlockList.tsx) – denne komponent er derfor kun selve
  // produktvælgeren for det ANTAL, layoutet allerede har fastlagt, uden sin
  // egen layout-UI.
  columns: GalleryColumns;
  onProductIdsChange: (productIds: string[]) => void;
  // Sat, når `products` stammer fra en emne-søgning (kan være mange, uden
  // grænse) – viser da et ekstra søgefelt øverst i produktlisten, så
  // brugeren kan indsnævre den, mens hun skriver. Ingen ændring for et
  // almindeligt, manuelt valgt produktsæt (typisk allerede lille).
  showProductSearch?: boolean;
}

export function GalleryBlockControls({
  products,
  selectedProductIds,
  columns,
  onProductIdsChange,
  showProductSearch = false,
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

  return (
    <div className="flex flex-col gap-3">
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
          <SearchableProductChecklist
            products={availableProducts}
            selectedProductIds={selectedProductIds}
            onToggle={toggleProduct}
            isDisabled={() => selectedProductIds.length >= columns}
            showSearch={showProductSearch}
            searchPlaceholder={`Søg blandt de ${availableProducts.length} matchede produkter...`}
          />
        </div>
      )}
    </div>
  );
}
