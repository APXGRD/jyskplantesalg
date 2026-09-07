// lib/mock/mockCustomers.ts
//
// Mock-data i SAMME FORM som det, Jysk Plantesalgs rigtige Shopify Admin API vil
// returnere for kunder. Shopify tracker allerede selv, om en kunde har sagt ja til
// markedsføring (marketingConsentStatus) — det er derfor bevidst IKKE en selvstændig
// database, I selv skal vedligeholde. Skift denne fil ud med en rigtig
// fetchShopifyCustomers()-funktion, når access-token'en er på plads.
//
// Kundetype (privat/erhverv) udledes af Shopifys tags-felt på kunden — ligesom
// produkternes type/farve. Det KRÆVER, at kunden (Jysk Plantesalg) rent faktisk
// tagger deres kunder på den måde i Shopify — værd at bekræfte med dem, ligesom vi
// gjorde med produkt-tags.

export interface ShopifyCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tags: string[]; // forventer "privat" eller "erhverv" et sted i listen
  marketingConsentStatus: "SUBSCRIBED" | "UNSUBSCRIBED" | "PENDING" | "NOT_SUBSCRIBED";
}

export const mockCustomers: ShopifyCustomer[] = [
  {
    id: "1",
    firstName: "Sofie",
    lastName: "Nielsen",
    email: "sofie@eksempel.dk",
    tags: ["privat"],
    marketingConsentStatus: "SUBSCRIBED",
  },
  {
    id: "2",
    firstName: "Lars",
    lastName: "Poulsen",
    email: "lars@groenanlaeg.dk",
    tags: ["erhverv"],
    marketingConsentStatus: "SUBSCRIBED",
  },
  {
    id: "3",
    firstName: "Anna",
    lastName: "Lindgren",
    email: "anna@eksempel.dk",
    tags: ["privat"],
    marketingConsentStatus: "SUBSCRIBED",
  },
  {
    id: "4",
    firstName: "Nord",
    lastName: "Landskab ApS",
    email: "indkob@nordlandskab.dk",
    tags: ["erhverv"],
    marketingConsentStatus: "SUBSCRIBED",
  },
  {
    id: "5",
    firstName: "Mette",
    lastName: "Holm",
    email: "mette@eksempel.dk",
    tags: ["privat"],
    marketingConsentStatus: "UNSUBSCRIBED",
  },
];

// Når det rigtige API er koblet på, laver I en funktion med denne signatur:
//
//   async function fetchShopifyCustomers(): Promise<ShopifyCustomer[]> {
//     ... rigtigt Admin API-kald her, læser customer.tags og
//     customer.emailAddress.marketingState ...
//     return customers;
//   }
//
// og bruger dens resultat i stedet for mockCustomers.
