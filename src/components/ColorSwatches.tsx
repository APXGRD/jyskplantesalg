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
}

// De farve-swatches, brugeren kan vælge imellem overalt i Edit-mode (global
// værktøjslinje, per-blok tekstfarve, CTA-knappens farver, blok-baggrunde) –
// genereret DIREKTE ud fra brand_colors (Supabase, via useBrandSettings):
// præcis så mange swatches, som kunden faktisk har valgt i Indstillinger
// (2-5), ingen faste neutrale farver tilføjet automatisk. Ændrer kunden sin
// farveliste i Indstillinger, opdateres disse swatches automatisk overalt,
// uden kodeændringer.
export function ColorSwatches({ value, onChange, label, autoOption = false }: ColorSwatchesProps) {
  const brand = useBrandSettings();

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[10px] text-ink-faintest">{label}</span>}
      <div className="flex items-center gap-1">
        {autoOption && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange("")}
            aria-label="Farve: Automatisk"
            aria-pressed={!value}
            title="Automatisk – sort eller hvid efter baggrunden"
            className={`h-5 shrink-0 rounded-full border border-black/10 px-1.5 text-[9px] leading-none font-medium text-ink-muted transition-transform hover:scale-105 ${
              !value ? "bg-surface-active text-ink ring-2 ring-ink ring-offset-1" : "bg-surface"
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
