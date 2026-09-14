// src/lib/shopify/fetchCustomers.ts
//
// Henter RIGTIGE kunder fra Shopifys Admin API (GraphQL) og mapper dem om til
// PRÆCIS samme form som ShopifyCustomer-interfacet i mockCustomers.ts, så resten
// af koden (Kunder-siden osv.) ikke skal ændres afhængigt af, om data kommer fra
// mock eller Shopify.
//
// Feltnavnene herunder er bekræftet via introspection (og et rigtigt kald,
// der faktisk returnerede udfyldte værdier) mod det AKTUELLE Shopify Admin
// API-skema (2026-07), ikke gættet: Customer-typen har ikke længere et fladt
// "email"-felt – selve emailadressen og markedsførings-samtykket ligger
// begge under Customer.defaultEmailAddress (CustomerEmailAddress), som
// henholdsvis "emailAddress" (String) og "marketingState"
// (CustomerEmailAddressMarketingState). Enum-værdierne for marketingState
// (NOT_SUBSCRIBED, PENDING, SUBSCRIBED, UNSUBSCRIBED, samt en femte
// "INVALID", som mock-typen ikke har) matcher ellers 1:1 mock-typens
// marketingConsentStatus.

import type { ShopifyCustomer } from "@/lib/mock/mockCustomers";

const SHOPIFY_API_VERSION = "2026-07";
// Shopifys maksimale sidestørrelse pr. GraphQL-forbindelse – bruges som
// sidestørrelse for HVER side i den cursor-baserede paginering herunder (se
// fetchShopifyCustomers), samme mønster/tilgang som PRODUCTS_PER_PAGE i
// fetchProducts.ts.
const CUSTOMERS_PER_PAGE = 250;

// Shopifys Admin API er cost-baseret rate limitet (se throttleStatus i hvert
// svars extensions-felt, sat automatisk af Shopify) – samme afgrænsning som
// fetchProducts.ts allerede bruger, genbrugt her uændret.
const LOW_THROTTLE_THRESHOLD = 200;
const THROTTLE_WAIT_MS = 1000;

const CUSTOMERS_QUERY = `
  query FetchCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after) {
      edges {
        node {
          id
          firstName
          lastName
          tags
          defaultEmailAddress {
            emailAddress
            marketingState
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// De fire værdier, mock-typen ShopifyCustomer.marketingConsentStatus kender.
type MarketingConsentStatus = ShopifyCustomer["marketingConsentStatus"];

interface ShopifyCustomerNode {
  id: string;
  firstName: string | null;
  lastName: string | null;
  tags: string[];
  defaultEmailAddress: {
    emailAddress: string;
    // Shopifys skema har en femte værdi, "INVALID" (ugyldigt e-mailformat),
    // som mock-typen ikke kender – håndteres eksplicit i mapCustomer herunder.
    marketingState: MarketingConsentStatus | "INVALID";
  } | null;
}

interface CustomersQueryResponse {
  data?: {
    customers: {
      edges: { node: ShopifyCustomerNode }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: { message: string }[];
  // Sat automatisk af Shopify på ALLE Admin API-svar (ikke noget, vi selv
  // forespørger i CUSTOMERS_QUERY) – se LOW_THROTTLE_THRESHOLD ovenfor.
  extensions?: {
    cost?: {
      throttleStatus?: {
        currentlyAvailable: number;
        restoreRate: number;
        maximumAvailable: number;
      };
    };
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// "INVALID" (ugyldig e-mailadresse) og en helt manglende defaultEmailAddress
// (ingen e-mail registreret på kunden) findes ikke i mock-typens firkantede
// fire-værdis union – begge er reelt "ikke tilmeldt markedsføring pr. e-mail",
// så de falder sikkert tilbage til NOT_SUBSCRIBED i stedet for enten at
// crashe eller gætte et optimistisk SUBSCRIBED.
function mapMarketingConsentStatus(
  marketingState: MarketingConsentStatus | "INVALID" | undefined,
): MarketingConsentStatus {
  if (marketingState === "INVALID" || marketingState === undefined) {
    return "NOT_SUBSCRIBED";
  }
  return marketingState;
}

function mapCustomerNode(node: ShopifyCustomerNode): ShopifyCustomer {
  return {
    id: node.id,
    firstName: node.firstName ?? "",
    lastName: node.lastName ?? "",
    email: node.defaultEmailAddress?.emailAddress ?? "",
    tags: node.tags,
    marketingConsentStatus: mapMarketingConsentStatus(node.defaultEmailAddress?.marketingState),
  };
}

// Henter ÉN side af CUSTOMERS_QUERY. Kaster en fejl med en tydelig,
// menneskelæsbar besked (netværksfejl, forkert/udløbet token, GraphQL-fejl),
// i stedet for at lade et rå/uforståeligt fetch-svar eller en uventet
// exception sive videre til kalderen – den skal selv fange fejlen og vise/
// returnere beskeden (se customers/route.ts). Samme opbygning som
// fetchProductsPage i fetchProducts.ts.
async function fetchCustomersPage(
  shop: string,
  accessToken: string,
  after: string | null,
): Promise<CustomersQueryResponse> {
  let response: Response;
  try {
    response = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: CUSTOMERS_QUERY,
        variables: { first: CUSTOMERS_PER_PAGE, after },
      }),
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

  const json = (await response.json()) as CustomersQueryResponse;

  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL-fejl: ${json.errors.map((error) => error.message).join("; ")}`);
  }

  return json;
}

// Henter og mapper ALLE kunder fra Shopifys Admin API, via cursor-baseret
// paginering (250 ad gangen) – ikke kun de første 250. Samler siderne op i én
// liste og returnerer den, i PRÆCIS samme form som hidtil (ShopifyCustomer[]),
// så kalderen (Kunder-siden osv.) ikke behøver kende til selve pagineringen.
// Samme mønster/tilgang som fetchShopifyProducts i fetchProducts.ts.
export async function fetchShopifyCustomers(): Promise<ShopifyCustomer[]> {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shop || !accessToken) {
    throw new Error("Mangler SHOPIFY_SHOP_DOMAIN eller SHOPIFY_ACCESS_TOKEN i .env.local");
  }

  const allCustomers: ShopifyCustomer[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const json = await fetchCustomersPage(shop, accessToken, after);
    const customers = json.data?.customers;
    const edges = customers?.edges ?? [];

    allCustomers.push(...edges.map(({ node }) => mapCustomerNode(node)));

    // Endnu en side at hente, MEN Shopify har (uventet) ikke leveret et
    // cursor at fortsætte fra – stopper her i stedet for at risikere en
    // uendelig løkke, der blot genhenter samme (eller ingen) side igen og igen.
    hasNextPage = Boolean(customers?.pageInfo.hasNextPage && customers.pageInfo.endCursor);
    after = customers?.pageInfo.endCursor ?? null;

    const throttleStatus = json.extensions?.cost?.throttleStatus;
    if (hasNextPage && throttleStatus && throttleStatus.currentlyAvailable < LOW_THROTTLE_THRESHOLD) {
      await sleep(THROTTLE_WAIT_MS);
    }
  }

  return allCustomers;
}
