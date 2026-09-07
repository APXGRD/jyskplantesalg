// Web-safe skrifttyper til nyhedsbrevet – delt mellem den globale
// skrifttype-vælger i Edit-mode og den eksisterende per-blok vælger i Tiptaps
// svævende værktøjslinje, så begge altid tilbyder præcis samme sæt.

export interface FontFamilyOption {
  label: string;
  value: string;
}

export const FONT_FAMILIES: FontFamilyOption[] = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Verdana, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

// Fjerner kun font-family-deklarationer fra inline style-attributter i en
// bloks HTML-indhold (fx et enkelt Tiptap-tekstudsnit, der tidligere fik sin
// egen skrifttype via værktøjslinjen) – uden at røre andre stilarter som
// farve eller skriftstørrelse på samme element. Bruges når det globale
// skrifttype-valg sættes, så det reelt overskriver evt. tidligere
// individuelle valg på enkelte blokke, i stedet for bare at blive
// overskygget af dem.
export function stripFontFamilyStyles(html: string): string {
  return html.replace(/style="([^"]*)"/g, (match, styleContent: string) => {
    const cleaned = styleContent
      .split(";")
      .map((rule) => rule.trim())
      .filter((rule) => rule && !rule.toLowerCase().startsWith("font-family"))
      .join("; ");
    return cleaned ? `style="${cleaned}"` : "";
  });
}
