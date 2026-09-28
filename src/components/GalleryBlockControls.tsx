"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import {
  MAX_GALLERY_UPLOAD_BYTES,
  getGallerySlots,
  type GalleryColumns,
  type GalleryUpload,
  type NewsletterBlock,
} from "@/lib/newsletterBlocks";
import { ImagePlaceholderIcon } from "@/components/icons";
import { SearchableProductChecklist } from "./SearchableProductChecklist";

export type GallerySlotMode = "product" | "upload";

interface GalleryBlockControlsProps {
  // De produkter, der allerede er valgt på "Vælg produkter"-siden – samme
  // liste som resten af nyhedsbrevet bruger. Ingen separat Shopify-hentning
  // her.
  products: ShopifyProduct[];
  selectedProductIds: string[];
  // Layout-valget (2/3/6) vælges i det fælles Billede-/Galleri-panel, der
  // omslutter denne komponent (se den samlede "billede"-case i
  // EditorBlockList.tsx).
  columns: GalleryColumns;
  // Én post pr. plads – se NewsletterBlock.galleryUploads.
  uploads: NewsletterBlock["galleryUploads"];
  onProductIdsChange: (productIds: string[]) => void;
  // Skifter en enkelt plads mellem "Vælg produkt" og "Upload eget billede".
  onSlotModeChange: (index: number, mode: GallerySlotMode) => void;
  // Sætter en upload-plads' billede/alt-tekst.
  onSlotUploadChange: (index: number, upload: GalleryUpload) => void;
  // Sat, når `products` stammer fra en emne-søgning (kan være mange, uden
  // grænse) – viser da et ekstra søgefelt øverst i produktlisten.
  showProductSearch?: boolean;
}

const MODE_OPTIONS: { value: GallerySlotMode; label: string }[] = [
  { value: "product", label: "Vælg produkt" },
  { value: "upload", label: "Upload eget billede" },
];

// Upload til én galleri-plads – samme teknik som "1 billede"-uploaden
// (ImageBlockControls.tsx): filen læses til en base64 data-URI, så billedet
// rejser med selve nyhedsbrevets HTML. Max. 500 KB (MAX_GALLERY_UPLOAD_BYTES).
function GallerySlotUpload({
  upload,
  onChange,
}: {
  upload: GalleryUpload;
  onChange: (upload: GalleryUpload) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Nulstil altid filvælgeren, så samme fil kan vælges igen efter en afvisning.
    event.target.value = "";
    if (!file) return;
    setError(null);

    if (file.size > MAX_GALLERY_UPLOAD_BYTES) {
      setError(`Filen er for stor (${Math.round(file.size / 1024)} KB) – maks. 500 KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ ...upload, imageUrl: reader.result });
      }
    };
    reader.onerror = () => setError("Kunne ikke læse filen. Prøv igen.");
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-surface-active text-ink-faint hover:border-ink-faintest"
          aria-label={upload.imageUrl ? "Udskift billede" : "Vælg billede"}
        >
          {upload.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI, next/image kan ikke optimere den
            <img src={upload.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlaceholderIcon className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-active hover:text-ink"
        >
          {upload.imageUrl ? "Udskift billede" : "Upload billede"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-muted">
          Alt-tekst <span className="text-ink-faintest">(Anbefalet)</span>
        </span>
        <input
          type="text"
          value={upload.altText ?? ""}
          onChange={(event) => onChange({ ...upload, altText: event.target.value })}
          placeholder="Beskriv billedet (vises hvis billedet ikke indlæses)"
          className={`rounded-md border px-2 py-1.5 text-xs text-ink focus:outline-none ${
            upload.altText ? "border-border" : "border-amber-300"
          }`}
        />
      </label>
    </div>
  );
}

export function GalleryBlockControls({
  products,
  selectedProductIds,
  columns,
  uploads,
  onProductIdsChange,
  onSlotModeChange,
  onSlotUploadChange,
  showProductSearch = false,
}: GalleryBlockControlsProps) {
  // Et galleri uden billede er meningsløst (og giver et tomt src-attribut i
  // Preview/eksporten) – produkter uden billede kan derfor slet ikke vælges
  // her, samme regel som "kun med billede"-filteret på "Vælg produkter"-siden.
  const availableProducts = products.filter((product) => product.hasImage);
  const slots = getGallerySlots({
    galleryColumns: columns,
    galleryProductIds: selectedProductIds,
    galleryUploads: uploads,
  });
  // Loftet for produktvælgeren er antallet af PRODUKT-pladser – upload-
  // pladserne tæller ikke med.
  const productSlotCount = slots.filter((slot) => slot.kind === "product").length;
  const hasEnoughProducts = availableProducts.length >= productSlotCount;

  function toggleProduct(id: string) {
    if (selectedProductIds.includes(id)) {
      onProductIdsChange(selectedProductIds.filter((productId) => productId !== id));
      return;
    }
    // Antallet af produkt-pladser sætter det faste loft – yderligere valg
    // ignoreres i stedet for at overskride det.
    if (selectedProductIds.length >= productSlotCount) return;
    onProductIdsChange([...selectedProductIds, id]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-ink-muted">Billedpladser</span>
        {slots.map((slot) => {
          const product =
            slot.kind === "product" ? products.find((item) => item.id === slot.productId) : undefined;
          return (
            <div key={slot.index} className="flex flex-col gap-2 rounded-md border border-border p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-ink">Plads {slot.index + 1}</span>
                <div className="flex gap-1">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSlotModeChange(slot.index, option.value)}
                      aria-pressed={slot.kind === option.value}
                      className={`rounded-md px-2 py-1 text-[11px] ${
                        slot.kind === option.value
                          ? "bg-surface-active text-ink"
                          : "text-ink-muted hover:bg-surface-active"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {slot.kind === "upload" ? (
                <GallerySlotUpload
                  upload={slot.upload}
                  onChange={(upload) => onSlotUploadChange(slot.index, upload)}
                />
              ) : (
                <p className="truncate text-[11px] text-ink-muted">
                  {product ? product.title : "Intet produkt valgt – vælg i listen herunder"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {productSlotCount > 0 &&
        (!hasEnoughProducts ? (
          <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
            Du har kun valgt {availableProducts.length}{" "}
            {availableProducts.length === 1 ? "produkt" : "produkter"} med billede på &quot;Vælg produkter&quot;-siden
            – vælg mindst {productSlotCount} dér, eller brug &quot;Upload eget billede&quot; på flere pladser.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">
              Produkter i galleriet ({selectedProductIds.length}/{productSlotCount})
            </span>
            <SearchableProductChecklist
              products={availableProducts}
              selectedProductIds={selectedProductIds}
              onToggle={toggleProduct}
              isDisabled={() => selectedProductIds.length >= productSlotCount}
              showSearch={showProductSearch}
              searchPlaceholder={`Søg blandt de ${availableProducts.length} matchede produkter...`}
            />
          </div>
        ))}
    </div>
  );
}
