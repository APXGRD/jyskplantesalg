// Samler al datahentning for Kunder-siden ét sted. Når det rigtige Shopify
// Admin API er koblet på (se kommentaren øverst i mockCustomers.ts), er det
// KUN getCustomers(), der skal ændres til et rigtigt (async) API-kald – resten
// af Kunder-siden og dens komponenter kender ikke til, om data kommer fra
// mock eller Shopify.

import { mockCustomers, type ShopifyCustomer } from "@/lib/mock/mockCustomers";
import type { CustomerType } from "@/lib/format";

export type { ShopifyCustomer };

export function getCustomers(): ShopifyCustomer[] {
  return mockCustomers;
}

export function getCustomerType(customer: ShopifyCustomer): CustomerType {
  return customer.tags.includes("erhverv") ? "erhverv" : "privat";
}

export function isActiveCustomer(customer: ShopifyCustomer): boolean {
  return customer.marketingConsentStatus === "SUBSCRIBED";
}
