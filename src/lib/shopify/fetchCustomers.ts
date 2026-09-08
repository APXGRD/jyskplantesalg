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
// Shopifys maksimale sidestørrelse pr. GraphQL-forbindelse. Henter kun første
// side (op til 250 kunder) for nu – tilstrækkeligt til en test-route; fuld
// cursor-baseret paginering (pageInfo.hasNextPage/endCursor) kan tilføjes
// senere, når funktionen rent faktisk kobles til UI'et og butikken har mere
// end 250 kunder.
const CUSTOMERS_PER_PAGE = 250;

const CUSTOMERS_QUERY = `
  query FetchCustomers($first: Int!) {
    customers(first: $first) {
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
    };
  };
  errors?: { message: string }[];
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

// Henter og mapper kunderne fra Shopifys Admin API. Kaster en fejl med en
// tydelig, menneskelæsbar besked (manglende miljøvariabler, netværksfejl,
// forkert/udløbet token, GraphQL-fejl), i stedet for at lade et rå/uforståeligt
// fetch-svar eller en uventet exception sive videre til kalderen – den skal selv
// fange fejlen og vise/returnere beskeden (se customers/route.ts).
export async function fetchShopifyCustomers(): Promise<ShopifyCustomer[]> {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shop || !accessToken) {
    throw new Error("Mangler SHOPIFY_SHOP_DOMAIN eller SHOPIFY_ACCESS_TOKEN i .env.local");
  }

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
        variables: { first: CUSTOMERS_PER_PAGE },
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

  const edges = json.data?.customers.edges ?? [];

  return edges.map(({ node }) => ({
    id: node.id,
    firstName: node.firstName ?? "",
    lastName: node.lastName ?? "",
    email: node.defaultEmailAddress?.emailAddress ?? "",
    tags: node.tags,
    marketingConsentStatus: mapMarketingConsentStatus(node.defaultEmailAddress?.marketingState),
  }));
}
