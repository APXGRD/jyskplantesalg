"use client";

import { useBrandSettings } from "@/context/BrandSettingsContext";

interface ColorSwatchesProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

// De farve-swatches, brugeren kan vælge imellem overalt i Edit-mode (global
// værktøjslinje, per-blok tekstfarve, CTA-knappens farver, blok-baggrunde) –
// genereret DIREKTE ud fra brand_colors (Supabase, via useBrandSettings):
// præcis så mange swatches, som kunden faktisk har valgt i Indstillinger
// (2-5), ingen faste neutrale farver tilføjet automatisk. Ændrer kunden sin
// farveliste i Indstillinger, opdateres disse swatches automatisk overalt,
// uden kodeændringer.
export function ColorSwatches({ value, onChange, label }: ColorSwatchesProps) {
  const brand = useBrandSettings();

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[10px] text-ink-faintest">{label}</span>}
      <div className="flex items-center gap-1">
        {brand.colors.map((color, index) => {
          const isActive = value?.toLowerCase() === color.toLowerCase();
          const swatchLabel = `Farve ${index + 1}`;
          return (
            <button
              key={`${index}-${color}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(color)}
              aria-label={`Farve: ${swatchLabel}`}
              aria-pressed={isActive}
              title={swatchLabel}
              className={`h-5 w-5 shrink-0 rounded-full border border-black/10 transition-transform hover:scale-110 ${
                isActive ? "ring-2 ring-ink ring-offset-1" : ""
              }`}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}
