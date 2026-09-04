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
