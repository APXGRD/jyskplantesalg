// src/lib/shopify/fetchProducts.ts
//
// Henter RIGTIGE produkter fra Shopifys Admin API (GraphQL) og mapper dem om til
// PRÆCIS samme form som ShopifyProduct-interfacet i mockShopifyData.ts, så resten
// af koden (Vælg produkter-siden, AI-prompten osv.) ikke skal ændres afhængigt
// af, om data kommer fra mock eller Shopify.

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";

const SHOPIFY_API_VERSION = "2026-07";
// Shopifys maksimale sidestørrelse pr. GraphQL-forbindelse – bruges som
// sidestørrelse for HVER side i den cursor-baserede paginering herunder
// (se fetchShopifyProducts), ikke kun for én enkelt forespørgsel.
const PRODUCTS_PER_PAGE = 250;

// Shopifys Admin API er cost-baseret rate limitet (se throttleStatus i hvert
// svars extensions-felt, sat automatisk af Shopify – ikke noget, vi selv
// beder om i selve GraphQL-forespørgslen). Falder currentlyAvailable under
// denne grænse mellem to sider, venter vi et kort øjeblik, før næste side
// hentes, i stedet for at fyre alle kald af i træk – relevant ved butikker
// med mange hundrede/tusinde produkter, hvor paginering ellers hurtigt kan
// ramme grænsen og få Shopify til at afvise et kald (THROTTLED).
const LOW_THROTTLE_THRESHOLD = 200;
const THROTTLE_WAIT_MS = 1000;

const PRODUCTS_QUERY = `
  query FetchProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          onlineStorePreviewUrl
          productType
          tags
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                price
              }
            }
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

interface ShopifyProductNode {
  id: string;
  title: string;
  handle: string;
  onlineStorePreviewUrl: string | null;
  productType: string;
  tags: string[];
  images: { edges: { node: { url: string } }[] };
  variants: { edges: { node: { price: string } }[] };
}

interface ProductsQueryResponse {
  data?: {
    products: {
      edges: { node: ShopifyProductNode }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: { message: string }[];
  // Sat automatisk af Shopify på ALLE Admin API-svar (ikke noget, vi selv
  // forespørger i PRODUCTS_QUERY) – se LOW_THROTTLE_THRESHOLD ovenfor.
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

function mapProductNode(node: ShopifyProductNode, shop: string): ShopifyProduct {
  const imageUrl = node.images.edges[0]?.node.url ?? "";
  const rawPrice = node.variants.edges[0]?.node.price;
  const price = rawPrice ? Number.parseFloat(rawPrice) : 0;
  // onlineStorePreviewUrl er den korrekte, altid-gyldige kunde-URL (respekterer
  // evt. custom domain) – men kan være null, hvis produktet ikke er publiceret
  // til Online Store-kanalen. Falder i så fald tilbage til at bygge URL'en ud
  // fra handle + shop-domænet direkte.
  const url = node.onlineStorePreviewUrl || `https://${shop}/products/${node.handle}`;

  return {
    id: node.id,
    title: node.title,
    price,
    imageUrl,
    url,
    productType: node.productType,
    tags: node.tags,
    hasImage: imageUrl.length > 0,
  };
}

// Henter ÉN side af PRODUCTS_QUERY. Kaster en fejl med en tydelig,
// menneskelæsbar besked (netværksfejl, forkert/udløbet token, GraphQL-fejl),
// i stedet for at lade et rå/uforståeligt fetch-svar eller en uventet
// exception sive videre til kalderen – den skal selv fange fejlen og vise/
// returnere beskeden (se products/route.ts).
async function fetchProductsPage(
  shop: string,
  accessToken: string,
  after: string | null,
): Promise<ProductsQueryResponse> {
  let response: Response;
  try {
    response = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: { first: PRODUCTS_PER_PAGE, after },
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

  const json = (await response.json()) as ProductsQueryResponse;

  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL-fejl: ${json.errors.map((error) => error.message).join("; ")}`);
  }

  return json;
}

// Henter og mapper ALLE produkter fra Shopifys Admin API, via cursor-baseret
// paginering (250 ad gangen) – ikke kun de første 250. Samler siderne op i én
// liste og returnerer den, i PRÆCIS samme form som hidtil (ShopifyProduct[]),
// så kalderen (products/route.ts) ikke behøver kende til selve pagineringen.
export async function fetchShopifyProducts(): Promise<ShopifyProduct[]> {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shop || !accessToken) {
    throw new Error("Mangler SHOPIFY_SHOP_DOMAIN eller SHOPIFY_ACCESS_TOKEN i .env.local");
  }

  const allProducts: ShopifyProduct[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const json = await fetchProductsPage(shop, accessToken, after);
    const products = json.data?.products;
    const edges = products?.edges ?? [];

    allProducts.push(...edges.map(({ node }) => mapProductNode(node, shop)));

    // Endnu en side at hente, MEN Shopify har (uventet) ikke leveret et
    // cursor at fortsætte fra – stopper her i stedet for at risikere en
    // uendelig løkke, der blot genhenter samme (eller ingen) side igen og igen.
    hasNextPage = Boolean(products?.pageInfo.hasNextPage && products.pageInfo.endCursor);
    after = products?.pageInfo.endCursor ?? null;

    const throttleStatus = json.extensions?.cost?.throttleStatus;
    if (hasNextPage && throttleStatus && throttleStatus.currentlyAvailable < LOW_THROTTLE_THRESHOLD) {
      await sleep(THROTTLE_WAIT_MS);
    }
  }

  return allProducts;
}
