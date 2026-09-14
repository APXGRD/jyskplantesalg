// src/lib/shopify/customerMutations.ts
//
// Skriver RIGTIGE kunde-ændringer til Shopifys Admin API (GraphQL) –
// customerCreate ved "Tilføj kunde", customerEmailMarketingConsentUpdate ved
// "Afmeld". Shopify er ALTID den reelle kilde til samtykke-status (juridisk
// krav) – disse to funktioner skriver UDELUKKENDE til Shopify; kalderen
// (customers/create og customers/unsubscribe API-routes) opdaterer selv
// cached_customers EFTER et bekræftet, vellykket Shopify-kald, aldrig før
// eller i stedet for.
//
// Mutation-navne/inputfelter/userErrors-struktur er bekræftet via live
// introspection mod det AKTUELLE Shopify Admin API-skema (2026-07), ikke
// gættet: customerCreate tager et CustomerInput (email/firstName/lastName/
// tags/emailMarketingConsent osv.), customerEmailMarketingConsentUpdate
// tager et CustomerEmailMarketingConsentUpdateInput (customerId +
// emailMarketingConsent { marketingState, ... }) – marketingState accepterer
// her KUN SUBSCRIBED/UNSUBSCRIBED/PENDING som input (NOT_SUBSCRIBED/
// REDACTED/INVALID er skrivebeskyttede/interne). Begge mutationers
// userErrors-felt er af den generiske UserError-type ({ field, message }),
// ikke en kunde-specifik fejltype.

import type { CustomerType } from "@/lib/format";
import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";
import { CUSTOMER_NODE_FIELDS, mapCustomerNode, type ShopifyCustomerNode } from "./fetchCustomers";

const SHOPIFY_API_VERSION = "2026-07";

interface UserError {
  field: string[] | null;
  message: string;
}

interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

function getShopCredentials(): { shop: string; accessToken: string } {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!shop || !accessToken) {
    throw new Error("Mangler SHOPIFY_SHOP_DOMAIN eller SHOPIFY_ACCESS_TOKEN i .env.local");
  }
  return { shop, accessToken };
}

// Samme fejlhåndterings-mønster som fetchCustomersPage/fetchProductsPage:
// tydelig, menneskelæsbar fejl ved netværksfejl/HTTP-fejl/transport-niveau
// GraphQL-fejl. Forretningsmæssige afvisninger (userErrors) håndteres
// separat af hver kalder herunder, da PRÆCIS hvilket felt/resultat der skal
// tjekkes er forskelligt for de to mutationer.
async function postShopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<ShopifyGraphQLResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new Error(
      `Kunne ikke kontakte Shopify (netværksfejl): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Shopify svarede med status ${response.status} ${response.statusText}.${body ? ` Svar: ${body}` : ""}`,
    );
  }

  const json = (await response.json()) as ShopifyGraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL-fejl: ${json.errors.map((error) => error.message).join("; ")}`);
  }

  return json;
}

function formatUserErrors(userErrors: UserError[]): string {
  return userErrors.map((error) => error.message).join("; ");
}

interface CustomerCreateResponse {
  customerCreate: {
    customer: ShopifyCustomerNode | null;
    userErrors: UserError[];
  };
}

const CUSTOMER_CREATE_MUTATION = `
  mutation CreateCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        ${CUSTOMER_NODE_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Opretter en RIGTIG kunde i Shopify. tags sættes til PRÆCIS ét element
// ([customerType]) – samme "privat"/"erhverv"-konvention, getCustomerType()
// allerede læser tilbage andre steder (se lib/customers.ts). Nye kunder
// tilføjet her antages at have givet markedsførings-samtykke (SUBSCRIBED,
// SINGLE_OPT_IN) – samme antagelse, CustomerPanel.tsx allerede gjorde
// LOKALT, før denne kunde reelt blev skrevet til Shopify (se
// customers/create/route.ts).
export async function createShopifyCustomer(input: {
  firstName: string;
  lastName: string;
  email: string;
  customerType: CustomerType;
}): Promise<ShopifyCustomer> {
  const { shop, accessToken } = getShopCredentials();

  const json = await postShopifyGraphQL<CustomerCreateResponse>(shop, accessToken, CUSTOMER_CREATE_MUTATION, {
    input: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      tags: [input.customerType],
      emailMarketingConsent: {
        marketingState: "SUBSCRIBED",
        marketingOptInLevel: "SINGLE_OPT_IN",
      },
    },
  });

  const result = json.data?.customerCreate;
  if (!result || result.userErrors.length > 0) {
    throw new Error(
      result?.userErrors.length
        ? `Shopify afviste kunden: ${formatUserErrors(result.userErrors)}`
        : "Shopify returnerede intet resultat for customerCreate.",
    );
  }
  if (!result.customer) {
    throw new Error("Shopify oprettede kunden, men returnerede ingen kundedata.");
  }

  return mapCustomerNode(result.customer);
}

interface CustomerEmailMarketingConsentUpdateResponse {
  customerEmailMarketingConsentUpdate: {
    customer: ShopifyCustomerNode | null;
    userErrors: UserError[];
  };
}

const CUSTOMER_UNSUBSCRIBE_MUTATION = `
  mutation UnsubscribeCustomer($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      customer {
        ${CUSTOMER_NODE_FIELDS}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Afmelder en RIGTIG kundes e-mail-markedsføring i Shopify
// (marketingState: UNSUBSCRIBED) – den ENESTE måde, "Afmeld"-knappen
// (tidligere "Slet", se CustomerRow.tsx) må ændre en kundes samtykke på:
// Shopify er den reelle kilde, aldrig kun cached_customers.
// customerId er kundens GID (samme form som ShopifyCustomer.id).
export async function unsubscribeShopifyCustomer(customerId: string): Promise<ShopifyCustomer> {
  const { shop, accessToken } = getShopCredentials();

  const json = await postShopifyGraphQL<CustomerEmailMarketingConsentUpdateResponse>(
    shop,
    accessToken,
    CUSTOMER_UNSUBSCRIBE_MUTATION,
    {
      input: {
        customerId,
        emailMarketingConsent: {
          marketingState: "UNSUBSCRIBED",
        },
      },
    },
  );

  const result = json.data?.customerEmailMarketingConsentUpdate;
  if (!result || result.userErrors.length > 0) {
    throw new Error(
      result?.userErrors.length
        ? `Shopify afviste afmeldingen: ${formatUserErrors(result.userErrors)}`
        : "Shopify returnerede intet resultat for customerEmailMarketingConsentUpdate.",
    );
  }
  if (!result.customer) {
    throw new Error("Shopify opdaterede samtykket, men returnerede ingen kundedata.");
  }

  return mapCustomerNode(result.customer);
}
