// To-bogstavs initial-mærke (fx "Jysk Plantesalg" -> "JP", "Plantesalg" ->
// "PL") – vises i stedet for et logo, når der ikke er uploadet et.
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]);
  return (letters.length > 1 ? letters.slice(0, 2).join("") : name.slice(0, 2)).toUpperCase();
}
