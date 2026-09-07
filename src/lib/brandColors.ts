// Kurateret sæt brand-farver til Edit-mode – bevidst IKKE en fri farvevælger
// (input type="color"), kun disse faste swatches, genbrugt overalt hvor
// brugeren kan vælge farve (tekst, CTA-knap, blok-baggrund).

export interface BrandColor {
  id: string;
  label: string;
  value: string;
}

export const DARK_TEXT_COLOR = "#1f2a1f";
export const LIGHT_TEXT_COLOR = "#ffffff";

export const BRAND_COLORS: BrandColor[] = [
  { id: "skovgroen", label: "Skovgrøn", value: "#2f5233" },
  { id: "moerk-tekst", label: "Mørk tekst", value: DARK_TEXT_COLOR },
  { id: "cremehvid", label: "Cremehvid", value: "#fffefc" },
  { id: "salvie", label: "Lys salvie", value: "#9caf88" },
  { id: "terracotta", label: "Terracotta", value: "#c1622d" },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  const value = parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Simpel opfattet-lysstyrke (YIQ) – god nok til at vælge mellem lys/mørk
// knap-tekst, uden at skulle implementere fuld WCAG-kontrastberegning.
export function getContrastTextColor(backgroundHex: string): string {
  const [r, g, b] = hexToRgb(backgroundHex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR;
}
