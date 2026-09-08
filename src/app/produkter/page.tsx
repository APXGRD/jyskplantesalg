"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { ChevronRightIcon } from "@/components/icons";
import { ErrorCard, LoadingCard } from "@/components/FetchStateCard";
import { PageHeader } from "@/components/PageHeader";
import { ProductFilterBar } from "@/components/ProductFilterBar";
import { ProductTable } from "@/components/ProductTable";
import { SelectionCounter } from "@/components/SelectionCounter";
import { SelectionFooter } from "@/components/SelectionFooter";
import { Sidebar } from "@/components/Sidebar";
import { useNewsletter } from "@/context/NewsletterContext";

export default function Home() {
  const router = useRouter();
  const { selectedProductIds, setSelectedProductIds, toggleProduct } = useNewsletter();

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("");
  const [tag, setTag] = useState("");
  const [onlyWithImage, setOnlyWithImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/shopify/products");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "Kunne ikke hente produkter fra Shopify.");
        }
        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  function retryLoadProducts() {
    setRetryToken((token) => token + 1);
  }

  const selectedIds = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);

  const productTypes = useMemo(
    () => Array.from(new Set(products.map((p) => p.productType))).sort(),
    [products],
  );

  const tags = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.tags))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (query && !product.title.toLowerCase().includes(query)) {
        return false;
      }
      if (productType && product.productType !== productType) {
        return false;
      }
      if (tag && !product.tags.includes(tag)) {
        return false;
      }
      if (onlyWithImage && !product.hasImage) {
        return false;
      }
      return true;
    });
  }, [products, search, productType, tag, onlyWithImage]);

  function toggleAllVisible(checked: boolean) {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      for (const product of filteredProducts) {
        if (checked) {
          next.add(product.id);
        } else {
          next.delete(product.id);
        }
      }
      return Array.from(next);
    });
  }

  function goToNextStep() {
    router.push("/opsaetning");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="products" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader
          title="Vælg produkter"
          subtitle="Markér de planter, der skal indgå i nyhedsbrevet"
          rightSlot={
            <>
              <SelectionCounter count={selectedIds.size} />
              <button
                type="button"
                onClick={goToNextStep}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-100"
              >
                Næste
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </>
          }
        />

        {isLoading ? (
          <LoadingCard message="Henter produkter fra Shopify..." />
        ) : loadError ? (
          <ErrorCard title="Kunne ikke hente produkter" message={loadError} onRetry={retryLoadProducts} />
        ) : (
          <>
            <ProductFilterBar
              search={search}
              onSearchChange={setSearch}
              productType={productType}
              onProductTypeChange={setProductType}
              productTypes={productTypes}
              tag={tag}
              onTagChange={setTag}
              tags={tags}
              onlyWithImage={onlyWithImage}
              onOnlyWithImageChange={setOnlyWithImage}
            />

            <ProductTable
              products={filteredProducts}
              selectedIds={selectedIds}
              onToggle={toggleProduct}
              onSelectAllChange={toggleAllVisible}
            />

            <SelectionFooter
              shown={filteredProducts.length}
              total={products.length}
              nextDisabled={selectedIds.size === 0}
              onNext={goToNextStep}
            />
          </>
        )}
      </div>
    </div>
  );
}
