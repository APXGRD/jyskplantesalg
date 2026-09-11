"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { buildNewsletterHtml, buildNewsletterText } from "@/lib/newsletterExport";
import { buildTemplateBlockStructure } from "@/lib/newsletterBlocks";
import { ErrorCard, LoadingCard } from "@/components/FetchStateCard";
import { Sidebar } from "@/components/Sidebar";
import { SegmentedControl } from "@/components/preview/SegmentedControl";
import { NewsletterCard } from "@/components/preview/NewsletterCard";
import { EditorBlockList } from "@/components/preview/EditorBlockList";
import { SaveTemplateDialog } from "@/components/preview/SaveTemplateDialog";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DesktopIcon,
  DocumentIcon,
  MobileIcon,
} from "@/components/icons";
import { useNewsletter } from "@/context/NewsletterContext";
import { useBrandSettings } from "@/context/BrandSettingsContext";

type View = "preview" | "rediger";
type Viewport = "desktop" | "mobil";
type CopyState = "idle" | "copied" | "error";
type SaveTemplateState = "idle" | "saved";

// Stabil, delt tom-array-reference for effectiveProductIds' fallback
// herunder – et nyt `[]`-literal ved hvert render ville ellers usynligt
// ugyldiggøre selectedProducts' useMemo hver gang, selvom intet reelt ændrer
// sig (react-hooks/exhaustive-deps).
const EMPTY_PRODUCT_IDS: string[] = [];

export default function PreviewPage() {
  const router = useRouter();
  const { result, customerType, instructions, topicMatchedProductIds, topicSearchTerm, blocks, setBlocks } =
    useNewsletter();
  const brand = useBrandSettings();

  const [activeView, setActiveView] = useState<View>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [saveTemplateState, setSaveTemplateState] = useState<SaveTemplateState>("idle");

  const [allProducts, setAllProducts] = useState<ShopifyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingProducts(true);
      setProductsError(null);
      try {
        // Læser fra den lokale Supabase-cache (samme som "Vælg produkter"-
        // siden), IKKE det direkte, fuldt paginerede /api/shopify/products –
        // se samme kommentar i NewsletterContext.tsx's setResult, som denne
        // fetch tidligere duplikerede (to fulde Shopify-kald i træk ved hver
        // generér→preview-tur).
        const response = await fetch("/api/products/cached");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "Kunne ikke hente produkter.");
        }
        if (!cancelled) {
          setAllProducts(data.products);
        }
      } catch (err) {
        if (!cancelled) {
          setProductsError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
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

  // Enhver generering er nu en fritekst-søgning (se generate-newsletter/
  // route.ts) – topicMatchedProductIds (sat af NewsletterContext.setResult)
  // er derfor altid HELE det matchede produkt-sæt for det aktuelle
  // resultat, ikke kun det ene produkt, billede-blokken oprindeligt viste.
  // Dette er dét, der gør hele udvalget tilgængeligt for både
  // Produktvisnings-blokken og Edit-mode's billede-/galleri-blok-vælger (se
  // EditorBlockList.tsx). Falder tilbage til en tom liste, hvis intet
  // resultat er genereret endnu.
  const effectiveProductIds = topicMatchedProductIds ?? EMPTY_PRODUCT_IDS;
  const selectedProducts = useMemo(
    () => allProducts.filter((product) => effectiveProductIds.includes(product.id)),
    [allProducts, effectiveProductIds],
  );

  const customerTypeLabel =
    customerType === "erhverv"
      ? "Erhvervskunder – priser vist ekskl. moms"
      : "Privatkunder – priser vist inkl. moms";

  async function handleCopy() {
    if (!result) return;

    const html = buildNewsletterHtml(blocks, result.image, customerType, selectedProducts, brand);
    const text = buildNewsletterText(blocks, result.image, customerType, selectedProducts, brand);

    try {
      if (typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopyState("copied");
    } catch (err) {
      console.error("Kunne ikke kopiere nyhedsbrevet:", err);
      setCopyState("error");
    } finally {
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  async function handleSaveTemplate(name: string, description: string) {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        block_structure: buildTemplateBlockStructure(blocks),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Kunne ikke gemme skabelonen. Prøv igen.");
    }

    setIsSaveTemplateOpen(false);
    setSaveTemplateState("saved");
    setTimeout(() => setSaveTemplateState("idle"), 2000);
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="preview" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <div className="flex flex-col gap-3 border-b border-border bg-surface px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SegmentedControl<View>
                value={activeView}
                onChange={setActiveView}
                options={[
                  { value: "preview", label: "Preview" },
                  { value: "rediger", label: "Rediger" },
                ]}
              />
              {activeView === "preview" && (
                <SegmentedControl<Viewport>
                  value={viewport}
                  onChange={setViewport}
                  options={[
                    { value: "desktop", label: "Desktop", icon: DesktopIcon },
                    { value: "mobil", label: "Mobil", icon: MobileIcon },
                  ]}
                />
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {activeView === "preview" && (
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateOpen(true)}
                  disabled={!result || blocks.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-active disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveTemplateState === "saved" ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <DocumentIcon className="h-3.5 w-3.5" />
                  )}
                  {saveTemplateState === "saved" ? "Skabelon gemt!" : "Gem som skabelon"}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-active disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copyState === "copied" ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
                {copyState === "copied" ? "Kopieret!" : "Kopiér nyhedsbrev"}
              </button>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-surface-active px-2.5 py-1 text-[11px] font-medium text-ink">
            {customerTypeLabel}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!result ? (
            <div className="flex justify-center">
              <div className="flex max-w-md flex-col gap-3 rounded-xl border border-border bg-white p-6">
                <p className="text-sm font-semibold text-ink">Intet nyhedsbrev genereret endnu</p>
                <p className="text-sm text-ink-muted">
                  Gå til Opsætning for at vælge målgruppe og generere nyhedsbrevet, før du kan
                  forhåndsvise eller redigere det her.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/opsaetning")}
                  className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                  Til Opsætning
                </button>
              </div>
            </div>
          ) : isLoadingProducts ? (
            <LoadingCard message="Henter produkter..." />
          ) : productsError ? (
            <ErrorCard title="Kunne ikke hente produkter" message={productsError} onRetry={retryLoadProducts} />
          ) : activeView === "preview" ? (
            <div className="flex justify-center">
              <NewsletterCard
                blocks={blocks}
                image={result.image}
                customerType={customerType}
                products={selectedProducts}
                viewport={viewport}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <EditorBlockList
                blocks={blocks}
                onBlocksChange={setBlocks}
                products={selectedProducts}
                topicMatchedProductIds={topicMatchedProductIds}
                topicSearchTerm={topicSearchTerm}
                customerType={customerType}
                instructions={instructions}
              />
            </div>
          )}
        </div>
      </div>

      {isSaveTemplateOpen && (
        <SaveTemplateDialog onClose={() => setIsSaveTemplateOpen(false)} onSave={handleSaveTemplate} />
      )}
    </div>
  );
}
