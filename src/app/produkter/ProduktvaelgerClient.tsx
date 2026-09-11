"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { ChevronRightIcon, RefreshIcon, SpinnerIcon } from "@/components/icons";
import { ErrorCard, LoadingCard } from "@/components/FetchStateCard";
import { PageHeader } from "@/components/PageHeader";
import { ProductFilterBar } from "@/components/ProductFilterBar";
import { ProductTable } from "@/components/ProductTable";
import { SelectionCounter } from "@/components/SelectionCounter";
import { SelectionFooter } from "@/components/SelectionFooter";
import { Sidebar } from "@/components/Sidebar";
import { useNewsletter } from "@/context/NewsletterContext";
import { formatRelativeTime } from "@/lib/format";

interface CachedProductsResponse {
  products: ShopifyProduct[];
  syncedAt: string | null;
}

// Delt af både fejl-retry og sync-handleren herunder – ren fetch + fejlbesked,
// ingen setState her, så begge kaldere selv bestemmer, hvornår/hvordan de
// opdaterer deres egen state. Selve FØRSTE sideindlæsning bruger IKKE denne –
// den data kommer allerede server-renderet som initialProducts/initialSyncedAt
// (se produkter/page.tsx) – kun genindlæsning EFTER en synkronisering eller
// et fejlet load går via denne klientside fetch.
async function loadCachedProducts(): Promise<CachedProductsResponse> {
  const response = await fetch("/api/products/cached");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Kunne ikke hente produkter.");
  }
  return { products: data.products, syncedAt: data.syncedAt };
}

interface ProduktvaelgerClientProps {
  initialProducts: ShopifyProduct[];
  initialSyncedAt: string | null;
  initialError: string | null;
}

export function ProduktvaelgerClient({
  initialProducts,
  initialSyncedAt,
  initialError,
}: ProduktvaelgerClientProps) {
  const router = useRouter();
  const { selectedProductIds, setSelectedProductIds, toggleProduct } = useNewsletter();

  // Server-renderet ved første sideindlæsning (se produkter/page.tsx) – intet
  // klientside mount-fetch/loading-spinner for den almindelige, succesfulde
  // sti. isLoading bruges kun mens en fejl-retry eller sync er i gang.
  const [products, setProducts] = useState<ShopifyProduct[]>(initialProducts);
  const [syncedAt, setSyncedAt] = useState<string | null>(initialSyncedAt);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialError);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("");
  const [tag, setTag] = useState("");
  const [onlyWithImage, setOnlyWithImage] = useState(false);

  async function retryLoadProducts() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { products: freshProducts, syncedAt: freshSyncedAt } = await loadCachedProducts();
      setProducts(freshProducts);
      setSyncedAt(freshSyncedAt);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/shopify/sync-products", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Kunne ikke synkronisere produkter fra Shopify.");
      }
      const { products: freshProducts, syncedAt: freshSyncedAt } = await loadCachedProducts();
      setProducts(freshProducts);
      setSyncedAt(freshSyncedAt);
      setLoadError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsSyncing(false);
    }
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

  const syncButton = (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSyncing ? (
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshIcon className="h-3.5 w-3.5" />
      )}
      {isSyncing ? "Synkroniserer..." : "Synkroniser produkter"}
    </button>
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader
          title="Vælg produkter"
          subtitle="Markér de planter, der skal indgå i nyhedsbrevet"
          rightSlot={
            <>
              <div className="flex items-center gap-3">
                {syncedAt && (
                  <span className="text-[12px] text-ink-faint">
                    Sidst opdateret: {formatRelativeTime(new Date(syncedAt))}
                  </span>
                )}
                {syncButton}
              </div>
              <div className="mx-1 h-5 w-px bg-border" />
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

        {syncError && (
          <p className="border-b border-border bg-surface px-8 py-2 text-[12px] text-red-600">{syncError}</p>
        )}

        {isLoading ? (
          <LoadingCard message="Henter produkter..." />
        ) : loadError ? (
          <ErrorCard title="Kunne ikke hente produkter" message={loadError} onRetry={retryLoadProducts} />
        ) : products.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-white p-8 text-center">
              <p className="text-sm font-semibold text-ink">Ingen produkter synkroniseret endnu</p>
              <p className="text-sm text-ink-muted">
                Klik på &quot;Synkroniser produkter&quot; for at hente jeres produkter fra Shopify. Det kan tage
                lidt tid ved mange produkter.
              </p>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="mt-1 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSyncing ? (
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshIcon className="h-3.5 w-3.5" />
                )}
                {isSyncing ? "Synkroniserer..." : "Synkroniser produkter"}
              </button>
            </div>
          </div>
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
