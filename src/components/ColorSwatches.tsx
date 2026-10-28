"use client";

import { useBrandSettings } from "@/context/BrandSettingsContext";

interface ColorSwatchesProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  // Viser et ekstra "Auto"-valg forrest, som nulstiller til den automatisk
  // udregnede farve (onChange("")) – fx header/footer-tekst, hvor "Auto" er
  // sort eller hvid efter baggrunden. Aktivt, når value er tom.
  autoOption?: boolean;
  // Figma-størrelsen i Preview-panelets "Global tekstfarve" (mindre prikker).
  compact?: boolean;
}

// De farve-swatches, brugeren kan vælge imellem overalt i Edit-mode (global
// værktøjslinje, per-blok tekstfarve, CTA-knappens farver, blok-baggrunde) –
// genereret DIREKTE ud fra brand_colors (Supabase, via useBrandSettings):
// præcis så mange swatches, som kunden faktisk har valgt i Indstillinger
// (2-5), ingen faste neutrale farver tilføjet automatisk. Ændrer kunden sin
// farveliste i Indstillinger, opdateres disse swatches automatisk overalt,
// uden kodeændringer.
export function ColorSwatches({ value, onChange, label, autoOption = false, compact = false }: ColorSwatchesProps) {
  const brand = useBrandSettings();

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-stone-dark">{label}:</span>}
      <div className={`flex items-center ${compact ? "gap-[4px]" : "gap-1.5"}`}>
        {autoOption && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange("")}
            aria-label="Farve: Automatisk"
            aria-pressed={!value}
            title="Automatisk – sort eller hvid efter baggrunden"
            className={`h-5 shrink-0 border px-1.5 text-[10px] leading-none transition-colors ${
              !value
                ? "border-forest bg-forest font-medium text-white"
                : "border-hairline bg-white text-stone-dark hover:border-plant-hover hover:bg-plant-hover hover:text-white"
            }`}
          >
            Auto
          </button>
        )}
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
              className={`${compact ? "size-[18px]" : "h-6 w-6"} shrink-0 rounded-[5px] border border-black/15 transition-transform hover:scale-110 ${
                isActive ? "ring-2 ring-forest ring-offset-2" : ""
              }`}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}
