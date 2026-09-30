"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlaceholderIcon, PencilIcon } from "@/components/icons";
import type { ImageAlignment, ImageSize } from "@/lib/newsletterBlocks";
import { UploadCaptionFields } from "./UploadCaptionFields";

interface ImageBlockControlsProps {
  imageUrl?: string;
  altText?: string;
  alignment: ImageAlignment;
  size: ImageSize;
  onImageChange: (imageUrl: string) => void;
  onAltTextChange: (altText: string) => void;
  onAlignmentChange: (alignment: ImageAlignment) => void;
  onSizeChange: (size: ImageSize) => void;
  // Kun sat, når billedet er UPLOADET (ikke et valgt produkts billede) – så
  // kan det have sin egen overskrift/pris (se UploadCaptionFields).
  caption?: {
    title?: string;
    price?: string;
    onTitleChange: (title: string) => void;
    onPriceChange: (price: string) => void;
  };
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
  caption,
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
        <div className="absolute bottom-full left-0 z-10 mb-2 w-80 border border-black bg-white p-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)]">
          <div className="flex flex-col gap-3">
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-black bg-white px-3 py-1.5 font-jetbrains text-xs font-medium text-black hover:bg-neutral-100"
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
              <span className="font-jetbrains text-[11px] text-neutral-600">
                Alt-tekst <span className="text-neutral-400">(Anbefalet)</span>
              </span>
              <input
                type="text"
                value={altText ?? ""}
                onChange={(event) => onAltTextChange(event.target.value)}
                placeholder="Beskriv billedet (vises hvis billedet ikke indlæses)"
                className={`rounded-none border bg-white px-2 py-1.5 font-jetbrains text-xs text-neutral-900 focus:border-black focus:outline-none ${
                  altText ? "border-neutral-300" : "border-amber-300"
                }`}
              />
            </label>

            {caption && (
              <UploadCaptionFields
                title={caption.title}
                price={caption.price}
                onTitleChange={caption.onTitleChange}
                onPriceChange={caption.onPriceChange}
              />
            )}

            <div className="flex flex-col gap-1">
              <span className="font-jetbrains text-[11px] text-neutral-600">Justering:</span>
              <div className="flex gap-1">
                {ALIGNMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onAlignmentChange(option.value)}
                    aria-pressed={alignment === option.value}
                    className={`flex-1 border px-2 py-1 font-jetbrains text-[11px] ${
                      alignment === option.value
                        ? "border-black bg-neutral-200 font-bold text-black"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-black"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-jetbrains text-[11px] text-neutral-600">Størrelse:</span>
              <div className="flex gap-1">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSizeChange(option.value)}
                    aria-pressed={size === option.value}
                    className={`flex-1 border px-2 py-1 font-jetbrains text-[11px] ${
                      size === option.value
                        ? "border-black bg-neutral-200 font-bold text-black"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-black"
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

      <button
        type="button"
        aria-label={imageUrl ? "Rediger billede" : "Tilføj billede"}
        className="group relative block w-full text-left"
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI, next/image kan ikke optimere den */}
            <img src={imageUrl} alt={altText ?? ""} className="h-32 w-full border border-neutral-300 object-cover" />
            {/* Vises ved hover/fokus, så det er tydeligt, at billedet kan klikkes. */}
            <span
              className={`absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 font-jetbrains text-xs font-medium text-white transition-opacity ${
                isFocused ? "opacity-0" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Klik for at redigere
            </span>
          </>
        ) : (
          <div className="flex h-20 items-center justify-center gap-2 border-2 border-dashed border-neutral-400 bg-white text-neutral-500 group-hover:border-black group-hover:text-black">
            <ImagePlaceholderIcon className="h-5 w-5" />
            <span className="font-jetbrains text-xs">Klik for at tilføje billede</span>
          </div>
        )}
      </button>
      {imageUrl && !isFocused && (
        <p className="pt-1.5 font-jetbrains text-[11px] text-neutral-500">
          {caption
            ? "Klik på billedet for at udskifte det og ændre alt-tekst, overskrift, pris, justering og størrelse."
            : "Klik på billedet for at udskifte det og ændre alt-tekst, justering og størrelse."}
        </p>
      )}
    </div>
  );
}
