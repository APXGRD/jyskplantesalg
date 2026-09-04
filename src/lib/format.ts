export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString("da-DK")} kr`;
}
