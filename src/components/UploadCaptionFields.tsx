"use client";

interface UploadCaptionFieldsProps {
  title?: string;
  price?: string;
  onTitleChange: (title: string) => void;
  onPriceChange: (price: string) => void;
}

const inputClassName =
  "w-full rounded-md border border-border px-2 py-1.5 text-xs text-ink focus:border-ink-faintest focus:outline-none";

// Valgfri overskrift og pris til et UPLOADET billede i Billede-/Galleri-
// blokken – vises under billedet i samme kort-stil som et produkts navn/pris
// (se getMediaCardText i newsletterBlocks.ts). Delt af galleri-pladsernes
// upload (GalleryBlockControls.tsx) og "1 billede"-uploaden
// (ImageBlockControls.tsx). Prisen er fri tekst (fx "299 kr").
export function UploadCaptionFields({ title, price, onTitleChange, onPriceChange }: UploadCaptionFieldsProps) {
  return (
    <div className="flex gap-2">
      <label className="flex min-w-0 flex-2 flex-col gap-1">
        <span className="text-[11px] text-ink-muted">
          Overskrift <span className="text-ink-faintest">(valgfri)</span>
        </span>
        <input
          type="text"
          value={title ?? ""}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="F.eks. Æbletræ 'Ingrid Marie'"
          className={inputClassName}
        />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] text-ink-muted">
          Pris <span className="text-ink-faintest">(valgfri)</span>
        </span>
        <input
          type="text"
          value={price ?? ""}
          onChange={(event) => onPriceChange(event.target.value)}
          placeholder="F.eks. 299 kr"
          className={inputClassName}
        />
      </label>
    </div>
  );
}
