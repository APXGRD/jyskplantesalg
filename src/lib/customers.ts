// Samler al datahentning for Kunder-siden ét sted – resten af Kunder-siden og
// dens komponenter kender ikke til, at data reelt hentes fra Shopify via
// /api/shopify/customers.

import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";
import type { CustomerType } from "@/lib/format";

export type { ShopifyCustomer };

export async function getCustomers(): Promise<ShopifyCustomer[]> {
  const response = await fetch("/api/shopify/customers");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Kunne ikke hente kunder fra Shopify.");
  }
  return data;
}

export function getCustomerType(customer: ShopifyCustomer): CustomerType {
  return customer.tags.includes("erhverv") ? "erhverv" : "privat";
}

export function isActiveCustomer(customer: ShopifyCustomer): boolean {
  return customer.marketingConsentStatus === "SUBSCRIBED";
}
