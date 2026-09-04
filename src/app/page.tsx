"use client";

import { useMemo, useState } from "react";
import { mockShopData } from "@/lib/mock/mockShopifyData";
import { ChevronRightIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { ProductFilterBar } from "@/components/ProductFilterBar";
import { ProductTable } from "@/components/ProductTable";
import { SelectionCounter } from "@/components/SelectionCounter";
import { SelectionFooter } from "@/components/SelectionFooter";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  const { products } = mockShopData;

  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("");
  const [tag, setTag] = useState("");
  const [onlyWithImage, setOnlyWithImage] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  function toggleProduct(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const product of filteredProducts) {
        if (checked) {
          next.add(product.id);
        } else {
          next.delete(product.id);
        }
      }
      return next;
    });
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
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-100"
              >
                Næste
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </>
          }
        />

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
        />
      </div>
    </div>
  );
}
