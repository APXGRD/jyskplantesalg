// Farve-swatchene til Edit-mode (global værktøjslinje, per-blok
// farve-vælgere osv.) bor nu i ColorSwatches.tsx selv, udledt live af
// brand-indstillingerne via useBrandSettings – se den for det tidligere
// faste 5-farve BRAND_COLORS-array, der stod her.

export const DARK_TEXT_COLOR = "#1f2a1f";
export const LIGHT_TEXT_COLOR = "#ffffff";

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

// Fjerner kun color-deklarationer fra inline style-attributter i en bloks
// HTML-indhold (fx et enkelt Tiptap-tekstudsnit, der tidligere fik sin egen
// tekstfarve via værktøjslinjens farve-swatches) – uden at røre andre
// stilarter som skrifttype eller -størrelse på samme element. Bruges når det
// globale tekstfarve-valg sættes, så det reelt overskriver evt. tidligere
// individuelle valg på enkelte blokke, i stedet for bare at blive overskygget
// af dem. Matcher kun den eksakte "color"-egenskab, så fx "background-color"
// på samme element ikke fjernes ved en fejl.
export function stripColorStyles(html: string): string {
  return html.replace(/style="([^"]*)"/g, (match, styleContent: string) => {
    const cleaned = styleContent
      .split(";")
      .map((rule) => rule.trim())
      .filter((rule) => rule && rule.split(":")[0]?.trim().toLowerCase() !== "color")
      .join("; ");
    return cleaned ? `style="${cleaned}"` : "";
  });
}
