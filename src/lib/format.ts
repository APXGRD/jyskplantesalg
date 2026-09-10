export type CustomerType = "privat" | "erhverv";

export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString("da-DK")} kr`;
}

// Erhvervskunder ser priser ekskl. moms (mockData-priserne er inkl. 25% moms).
// Privatkunder ser prisen som den står, uden eksplicit moms-omtale.
export function formatPriceForCustomer(price: number, customerType: CustomerType): string {
  if (customerType === "erhverv") {
    const priceExVat = Math.round((price / 1.25) * 100) / 100;
    return `${priceExVat.toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kr ekskl. moms`;
  }
  return formatPrice(price);
}

// Dansk relativ tid (fx "for 3 dage siden") – bruges til "Sidst
// opdateret"-visningen ved cachede Shopify-produkter (se produkter/page.tsx).
// Grov trin-inddeling (sekunder/minutter/timer/dage) er tilstrækkelig her,
// ingen grund til en fuld i18n-relativtids-afhængighed for én enkelt brug.
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 60) return "for få sekunder siden";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `for ${diffMinutes} ${diffMinutes === 1 ? "minut" : "minutter"} siden`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `for ${diffHours} ${diffHours === 1 ? "time" : "timer"} siden`;
  const diffDays = Math.round(diffHours / 24);
  return `for ${diffDays} ${diffDays === 1 ? "dag" : "dage"} siden`;
}
