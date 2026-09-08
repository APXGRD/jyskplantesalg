// src/lib/shopify/fetchProducts.ts
//
// Henter RIGTIGE produkter fra Shopifys Admin API (GraphQL) og mapper dem om til
// PRÆCIS samme form som ShopifyProduct-interfacet i mockShopifyData.ts, så resten
// af koden (Vælg produkter-siden, AI-prompten osv.) ikke skal ændres afhængigt
// af, om data kommer fra mock eller Shopify.

import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";

const SHOPIFY_API_VERSION = "2026-07";
// Shopifys maksimale sidestørrelse pr. GraphQL-forbindelse. Henter kun første
// side (op til 250 produkter) for nu – tilstrækkeligt til en test-route;
// fuld cursor-baseret paginering (pageInfo.hasNextPage/endCursor) kan
// tilføjes senere, når funktionen rent faktisk kobles til UI'et og butikken
// har mere end 250 produkter.
const PRODUCTS_PER_PAGE = 250;

const PRODUCTS_QUERY = `
  query FetchProducts($first: Int!) {
    products(first: $first) {
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
    };
  };
  errors?: { message: string }[];
}

// Henter og mapper produkterne fra Shopifys Admin API. Kaster en fejl med en
// tydelig, menneskelæsbar besked (manglende miljøvariabler, netværksfejl,
// forkert/udløbet token, GraphQL-fejl), i stedet for at lade et rå/uforståeligt
// fetch-svar eller en uventet exception sive videre til kalderen – den skal selv
// fange fejlen og vise/returnere beskeden (se products/route.ts).
export async function fetchShopifyProducts(): Promise<ShopifyProduct[]> {
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
        query: PRODUCTS_QUERY,
        variables: { first: PRODUCTS_PER_PAGE },
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

  const edges = json.data?.products.edges ?? [];

  return edges.map(({ node }) => {
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
  });
}
