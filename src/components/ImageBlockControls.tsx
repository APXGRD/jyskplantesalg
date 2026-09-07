"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlaceholderIcon } from "@/components/icons";
import type { ImageAlignment, ImageSize } from "@/lib/newsletterBlocks";

interface ImageBlockControlsProps {
  imageUrl?: string;
  altText?: string;
  alignment: ImageAlignment;
  size: ImageSize;
  onImageChange: (imageUrl: string) => void;
  onAltTextChange: (altText: string) => void;
  onAlignmentChange: (alignment: ImageAlignment) => void;
  onSizeChange: (size: ImageSize) => void;
}

const ALIGNMENT_OPTIONS: { value: ImageAlignment; label: string }[] = [
  { value: "venstre", label: "Venstre" },
  { value: "center", label: "Center" },
  { value: "hoejre", label: "Højre" },
];

const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "lille", label: "Lille" },
  { value: "mellem", label: "Mellem" },
  { value: "fuld", label: "Fuld bredde" },
];

export function ImageBlockControls({
  imageUrl,
  altText,
  alignment,
  size,
  onImageChange,
  onAltTextChange,
  onAlignmentChange,
  onSizeChange,
}: ImageBlockControlsProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFocus() {
    setIsFocused(true);
  }

  function handleBlur() {
    // `event.relatedTarget` er ikke pålideligt her: når "Udskift billede" åbner
    // den native fil-vælger, mister siden fokus til selve OS-dialogen, og
    // relatedTarget bliver null (selvom brugeren stadig er i gang med
    // interaktionen). Vi udsætter derfor tjekket ét tick og ser, hvor fokus
    // reelt er landet, i stedet for at stole på selve blur-eventet alene.
    requestAnimationFrame(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsFocused(false);
      }
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // NB: Dette er KUN en client-side preview – filen uploades/gemmes ikke
    // nogen steder endnu (rigtig upload/lagring, fx til Shopify eller en
    // fil-service, kobles på senere). Vi konverterer filen til en base64
    // data-URI (i stedet for URL.createObjectURL) netop for at billedet
    // rejser med selve HTML'en – en blob:-URL virker kun i den browser-fane,
    // den blev oprettet i, mens en data-URI er en selvstændig streng, der
    // stadig virker, når nyhedsbrevet kopieres/indsættes andre steder.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImageChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div ref={containerRef} onFocus={handleFocus} onBlur={handleBlur} className="relative">
      {isFocused && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-72 rounded-lg border border-border bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <div className="flex flex-col gap-3">
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-active hover:text-ink"
              >
                Udskift billede
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">
                Alt-tekst <span className="text-red-500">*</span>{" "}
                <span className="text-ink-faintest">(Anbefalet)</span>
              </span>
              <input
                type="text"
                value={altText ?? ""}
                onChange={(event) => onAltTextChange(event.target.value)}
                placeholder="Beskriv billedet (vises hvis billedet ikke indlæses)"
                className={`rounded-md border px-2 py-1.5 text-xs text-ink focus:outline-none ${
                  altText ? "border-border" : "border-amber-300"
                }`}
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">Justering</span>
              <div className="flex gap-1">
                {ALIGNMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onAlignmentChange(option.value)}
                    aria-pressed={alignment === option.value}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] ${
                      alignment === option.value
                        ? "bg-surface-active text-ink"
                        : "text-ink-muted hover:bg-surface-active"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-ink-muted">Størrelse</span>
              <div className="flex gap-1">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSizeChange(option.value)}
                    aria-pressed={size === option.value}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] ${
                      size === option.value
                        ? "bg-surface-active text-ink"
                        : "text-ink-muted hover:bg-surface-active"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="block w-full text-left">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI, next/image kan ikke optimere den
          <img src={imageUrl} alt={altText ?? ""} className="h-24 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-active text-ink-faint">
            <ImagePlaceholderIcon className="h-5 w-5" />
            <span className="text-xs">Klik for at tilføje billede</span>
          </div>
        )}
      </button>
    </div>
  );
}
