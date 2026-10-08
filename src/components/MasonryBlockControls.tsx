"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlaceholderIcon, SpinnerIcon, TrashIcon, UploadIcon } from "@/components/icons";
import {
  MASONRY_COLUMN_OPTIONS,
  MAX_MASONRY_IMAGES,
  type CtaBorderRadius,
  type MasonryColumns,
  type MasonryGap,
  type MasonryImage,
  type MasonryLayout,
} from "@/lib/newsletterBlocks";

interface MasonryBlockControlsProps {
  images: MasonryImage[];
  layout: MasonryLayout;
  columns: MasonryColumns;
  gap: MasonryGap;
  radius: CtaBorderRadius;
  onImagesChange: (images: MasonryImage[]) => void;
  onLayoutChange: (layout: MasonryLayout) => void;
  onColumnsChange: (columns: MasonryColumns) => void;
  onGapChange: (gap: MasonryGap) => void;
  onRadiusChange: (radius: CtaBorderRadius) => void;
}

const GAP_OPTIONS: { value: MasonryGap; label: string }[] = [
  { value: "ingen", label: "Ingen" },
  { value: "lille", label: "Lille" },
  { value: "stor", label: "Stor" },
];

const RADIUS_OPTIONS: { value: CtaBorderRadius; label: string }[] = [
  { value: "skarp", label: "Skarpe" },
  { value: "afrundet", label: "Let afrundet" },
  { value: "pille", label: "Afrundet" },
];

// Gruppe af gensidigt udelukkende valg i samme stil som resten af editoren.
function OptionButtons<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`border px-2 py-1.5 text-center font-jetbrains text-[11px] transition-colors ${
            value === option.value
              ? "border-black bg-neutral-200 font-bold text-black"
              : "border-neutral-300 bg-white text-neutral-600 hover:border-black"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const LAYOUT_OPTIONS: { value: MasonryLayout; label: string; description: string }[] = [
  { value: "fuld", label: "Fuld bredde", description: "Hvert billede i hele bredden, under hinanden" },
  { value: "masonry", label: "Masonry-gitter", description: "Flere billeder i kolonner, i deres egne proportioner" },
];

// Små forhåndsvisninger af de to visninger på valg-knapperne.
function LayoutPreview({ layout }: { layout: MasonryLayout }) {
  if (layout === "fuld") {
    return (
      <span className="flex w-8 flex-col gap-0.5" aria-hidden>
        <span className="h-2.5 w-full bg-current" />
        <span className="h-2.5 w-full bg-current" />
      </span>
    );
  }
  return (
    <span className="flex w-8 gap-0.5" aria-hidden>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="h-3 bg-current" />
        <span className="h-2 bg-current" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="h-2 bg-current" />
        <span className="h-3 bg-current" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="h-4 bg-current" />
        <span className="h-1 bg-current" />
      </span>
    </span>
  );
}

// Billederne gemmes som base64 data-URI'er (samme teknik som de øvrige
// uploads), og rejser både med nyhedsbrevets HTML og i udkastet i
// localStorage – 10 billeder i fuld kamera-opløsning ville fylde mange MB og
// sprænge browserens lager. Hvert billede nedskaleres derfor til højst
// MAX_IMAGE_WIDTH_PX bredde (rigeligt til selv 2 kolonner på en retina-skærm)
// og gemmes som JPEG, typisk 50-150 KB.
const MAX_IMAGE_WIDTH_PX = 800;
const JPEG_QUALITY = 0.82;
// Loft på den ORIGINALE fil – nedskaleringen klarer resten.
const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024;

async function prepareMasonryUpload(file: File): Promise<MasonryImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Kunne ikke læse billedet."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Kunne ikke behandle billedet.");
    // Hvid baggrund, så gennemsigtige PNG-områder ikke bliver sorte i JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return {
      id: crypto.randomUUID(),
      src: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
      width,
      height,
      altText: "",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function MasonryBlockControls({
  images,
  layout,
  columns,
  gap,
  radius,
  onImagesChange,
  onLayoutChange,
  onColumnsChange,
  onGapChange,
  onRadiusChange,
}: MasonryBlockControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_MASONRY_IMAGES - images.length;

  async function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Nulstil altid, så samme fil(er) kan vælges igen.
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const problems: string[] = [];
    const accepted = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name} er ikke et billede`);
        return false;
      }
      if (file.size > MAX_SOURCE_FILE_BYTES) {
        problems.push(`${file.name} er for stor (maks. 15 MB)`);
        return false;
      }
      return true;
    });
    if (accepted.length > remaining) {
      problems.push(`kun ${remaining} ${remaining === 1 ? "billede" : "billeder"} mere er plads til (maks. ${MAX_MASONRY_IMAGES})`);
    }
    const toProcess = accepted.slice(0, Math.max(remaining, 0));

    setIsProcessing(true);
    const prepared: MasonryImage[] = [];
    for (const file of toProcess) {
      try {
        prepared.push(await prepareMasonryUpload(file));
      } catch {
        problems.push(`${file.name} kunne ikke læses`);
      }
    }
    setIsProcessing(false);
    if (prepared.length > 0) onImagesChange([...images, ...prepared]);
    if (problems.length > 0) setError(`Bemærk: ${problems.join(", ")}.`);
  }

  function removeImage(id: string) {
    onImagesChange(images.filter((image) => image.id !== id));
  }

  function updateAltText(id: string, altText: string) {
    onImagesChange(images.map((image) => (image.id === id ? { ...image, altText } : image)));
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-jetbrains text-xs text-neutral-500">
        Upload dine egne billeder (fx fra butikken eller et event) – vis dem i fuld bredde eller som et
        masonry-gitter. Har intet med produkterne at gøre.
      </p>

      <div className="flex max-w-md flex-col gap-1.5">
        <span className="font-jetbrains text-xs text-neutral-600">Visning:</span>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onLayoutChange(option.value)}
              aria-pressed={layout === option.value}
              title={option.description}
              className={`flex items-center gap-2.5 border p-2 text-left font-jetbrains text-xs transition-colors ${
                layout === option.value
                  ? "border-black bg-neutral-100 font-semibold text-black"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-black"
              }`}
            >
              <LayoutPreview layout={option.value} />
              <span className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-[10px] font-normal text-neutral-500">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
        {layout === "masonry" && images.length === 1 && (
          <p className="font-jetbrains text-[11px] text-neutral-500">
            Tip: masonry-gitteret giver først mening med flere billeder – upload flere herunder.
          </p>
        )}
      </div>

      {layout === "masonry" && (
        <div className="flex max-w-md flex-col gap-1.5">
          <span className="font-jetbrains text-xs text-neutral-600">Kolonner:</span>
          <OptionButtons
            options={MASONRY_COLUMN_OPTIONS.map((option) => ({ value: option, label: `${option} kolonner` }))}
            value={columns}
            onChange={onColumnsChange}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="font-jetbrains text-xs text-neutral-600">Afstand mellem billeder:</span>
          <OptionButtons options={GAP_OPTIONS} value={gap} onChange={onGapChange} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-jetbrains text-xs text-neutral-600">Hjørner:</span>
          <OptionButtons options={RADIUS_OPTIONS} value={radius} onChange={onRadiusChange} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 font-jetbrains">
          <span className="text-xs font-bold tracking-wider text-neutral-800 uppercase">
            Billeder ({images.length}/{MAX_MASONRY_IMAGES})
          </span>
          <span className="text-[11px] text-neutral-500">Nedskaleres automatisk</span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={remaining <= 0 || isProcessing}
          className="flex h-20 items-center justify-center gap-2 border-2 border-dashed border-neutral-400 bg-white font-jetbrains text-xs text-neutral-600 transition-colors hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-neutral-400 disabled:hover:text-neutral-600"
        >
          {isProcessing ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
          {isProcessing
            ? "Behandler billeder..."
            : remaining <= 0
              ? `Maks. ${MAX_MASONRY_IMAGES} billeder – fjern et for at tilføje flere`
              : "Upload billeder – vælg gerne flere på én gang"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          className="sr-only"
        />
        {error && <p className="font-jetbrains text-[11px] text-amber-800">{error}</p>}

        {images.length > 0 ? (
          <ul className="flex flex-col divide-y divide-neutral-200 border border-neutral-300 bg-white">
            {images.map((image, index) => (
              <li key={image.id} className="flex items-center gap-3 p-2">
                <span className="w-5 shrink-0 text-center font-jetbrains text-[11px] font-bold text-neutral-500">
                  {index + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI */}
                <img src={image.src} alt="" className="h-12 w-12 shrink-0 border border-neutral-200 object-cover" />
                <input
                  type="text"
                  value={image.altText ?? ""}
                  onChange={(event) => updateAltText(image.id, event.target.value)}
                  placeholder="Alt-tekst (anbefalet) – beskriv billedet"
                  aria-label={`Alt-tekst for billede ${index + 1}`}
                  className="min-w-0 flex-1 rounded-none border border-neutral-300 bg-[#fdfdfb] px-2 py-1.5 font-jetbrains text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label={`Fjern billede ${index + 1}`}
                  title="Fjern billede"
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 font-jetbrains text-[11px] text-neutral-400">
            <ImagePlaceholderIcon className="h-4 w-4" />
            Ingen billeder endnu.
          </p>
        )}
      </div>
    </div>
  );
}
