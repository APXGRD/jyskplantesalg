"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mockShopData } from "@/lib/mock/mockShopifyData";
import { buildNewsletterHtml, buildNewsletterText } from "@/lib/newsletterExport";
import { Sidebar } from "@/components/Sidebar";
import { SegmentedControl } from "@/components/preview/SegmentedControl";
import { NewsletterCard } from "@/components/preview/NewsletterCard";
import { EditorBlockList } from "@/components/preview/EditorBlockList";
import { ArrowLeftIcon, CheckIcon, CopyIcon, DesktopIcon, MobileIcon } from "@/components/icons";
import { useNewsletter } from "@/context/NewsletterContext";

type View = "preview" | "rediger";
type Viewport = "desktop" | "mobil";
type CopyState = "idle" | "copied" | "error";

export default function PreviewPage() {
  const router = useRouter();
  const { result, customerType, selectedProductIds, blocks, setBlocks } = useNewsletter();

  const [activeView, setActiveView] = useState<View>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const selectedProducts = useMemo(
    () => mockShopData.products.filter((product) => selectedProductIds.includes(product.id)),
    [selectedProductIds],
  );

  const customerTypeLabel =
    customerType === "erhverv"
      ? "Erhvervskunder – priser vist ekskl. moms"
      : "Privatkunder – priser vist inkl. moms";

  async function handleCopy() {
    if (!result) return;

    const html = buildNewsletterHtml(blocks, result.image, customerType, selectedProducts);
    const text = buildNewsletterText(blocks, result.image, customerType, selectedProducts);

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
                customerType={customerType}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
