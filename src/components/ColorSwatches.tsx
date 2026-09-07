import { BRAND_COLORS } from "@/lib/brandColors";

interface ColorSwatchesProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorSwatches({ value, onChange, label }: ColorSwatchesProps) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[10px] text-ink-faintest">{label}</span>}
      <div className="flex items-center gap-1">
        {BRAND_COLORS.map((color) => {
          const isActive = value?.toLowerCase() === color.value.toLowerCase();
          return (
            <button
              key={color.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(color.value)}
              aria-label={`Farve: ${color.label}`}
              aria-pressed={isActive}
              title={color.label}
              className={`h-5 w-5 shrink-0 rounded-full border border-black/10 transition-transform hover:scale-110 ${
                isActive ? "ring-2 ring-ink ring-offset-1" : ""
              }`}
              style={{ backgroundColor: color.value }}
            />
          );
        })}
      </div>
    </div>
  );
}
