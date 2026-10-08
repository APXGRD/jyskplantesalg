"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { buildNewsletterHtml, buildNewsletterText } from "@/lib/newsletterExport";
import { cropMasonryImagesForExport } from "@/lib/masonryExport";
import { buildTemplateBlockStructure } from "@/lib/newsletterBlocks";
import { SectionLabel, StitchShell } from "@/components/StitchShell";
import { SegmentedControl } from "@/components/preview/SegmentedControl";
import { NewsletterCard } from "@/components/preview/NewsletterCard";
import { EditorBlockList, getBlockTitle } from "@/components/preview/EditorBlockList";
import { SaveTemplateDialog } from "@/components/preview/SaveTemplateDialog";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DesktopIcon,
  DocumentIcon,
  MobileIcon,
} from "@/components/icons";
import { useNewsletter } from "@/context/NewsletterContext";
import { useBrandSettings } from "@/context/BrandSettingsContext";

// Små "+"-sigtekorn på lærredets hjørner (Stitch-redesignet).
function Crosshairs() {
  const corner =
    "pointer-events-none absolute z-10 h-2.5 w-2.5 before:absolute before:top-1 before:left-0 before:h-px before:w-2.5 before:bg-neutral-500 after:absolute after:top-0 after:left-1 after:h-2.5 after:w-px after:bg-neutral-500";
  return (
    <>
      <span className={`${corner} -top-1.5 -left-1.5`} />
      <span className={`${corner} -top-1.5 -right-1.5`} />
      <span className={`${corner} -bottom-1.5 -left-1.5`} />
      <span className={`${corner} -right-1.5 -bottom-1.5`} />
    </>
  );
}

function InspectorCard({
  label,
  tag,
  tagClassName = "bg-neutral-100 text-neutral-900",
  children,
}: {
  label: string;
  tag?: string;
  tagClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-[#e2e2df] bg-white p-3">
      <div className="mb-1 flex justify-between gap-2 text-[10px] tracking-wider text-neutral-400 uppercase">
        <span>{label}</span>
        {tag && <span className={`px-1 font-bold ${tagClassName}`}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

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

  // Én samlet visning (Shopify-stil): nyhedsbrevet i midten og et sidepanel
  // med den valgte bloks kontroller. null = sidepanelet viser bloklisten.
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  // Kun på smal skærm, hvor sidepanelet er et panel i bunden: er det foldet
  // ud? (På bred skærm er sidepanelet altid synligt.)
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  function selectBlock(id: string | null) {
    setSelectedBlockId(id);
    if (id) setIsPanelOpen(true);
  }
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [saveTemplateState, setSaveTemplateState] = useState<SaveTemplateState>("idle");

  const [allProducts, setAllProducts] = useState<ShopifyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Et nyhedsbrev uden produktsæt (fx "Blank skabelon" fra Opsætning) har
  // ingen produkter at vælge imellem – katalogets produkter hentes da slet
  // ikke (selectedProducts herunder ville alligevel være tom).
  const hasProductSet = topicMatchedProductIds !== null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasProductSet) {
        setAllProducts([]);
        setProductsError(null);
        setIsLoadingProducts(false);
        return;
      }
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
  }, [retryToken, hasProductSet]);

  function retryLoadProducts() {
    setRetryToken((token) => token + 1);
  }

  // Enhver generering er nu en fritekst-søgning (se generate-newsletter/
  // route.ts) – topicMatchedProductIds (sat af NewsletterContext.setResult)
  // er derfor altid HELE det matchede produkt-sæt for det aktuelle
  // resultat, ikke kun det ene produkt, billede-blokken oprindeligt viste.
  // Dette er dét, der gør hele udvalget tilgængeligt for Edit-mode's
  // billede-/galleri-blok-vælger (se EditorBlockList.tsx). Falder tilbage til en tom liste, hvis intet
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

    const text = buildNewsletterText(blocks, result.image, customerType, selectedProducts, brand);
    // Masonry-billeder beskæres (asynkront) til deres plads, før HTML'en
    // bygges – se cropMasonryImagesForExport. Givet som et løfte direkte til
    // ClipboardItem, så kopieringen stadig sker inden for selve klikket
    // (Safari afviser ellers udklipsholderen efter en asynkron pause).
    const htmlBlob = cropMasonryImagesForExport(blocks).then(
      (exportBlocks) =>
        new Blob([buildNewsletterHtml(exportBlocks, result.image, customerType, selectedProducts, brand)], {
          type: "text/html",
        }),
    );

    try {
      if (typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/html": htmlBlob,
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


  const isB2B = customerType === "erhverv";

  // Editoren (sidepanelet) vises kun, når der er et nyhedsbrev at redigere.
  const showEditor = Boolean(result) && !isLoadingProducts && !productsError;
  // Den valgte blok – kan forsvinde (fx slettet), så slås op hver gang.
  const selectedBlock = selectedBlockId ? blocks.find((block) => block.id === selectedBlockId) : undefined;

  return (
    <StitchShell active="preview">
      {/* Titel + målgruppe-badge + trinindikator */}
      <section className="border-b border-black/10 bg-white/40 px-4 py-6 sm:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-1.5 font-jetbrains text-[10px] tracking-widest text-[#71717A] uppercase">
              Trin 02 <span className="text-black/30">/</span> Nyhedsbrev
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase sm:text-4xl">Preview / Rediger</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#71717A]">
              Gennemse og redigér det genererede nyhedsbrev, før det kopieres eller gemmes som skabelon.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <span className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-2.5 py-1 font-jetbrains text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <span className="h-2 w-2 rounded-full bg-neutral-900" />
              <span className="font-medium text-neutral-800">{customerTypeLabel}</span>
            </span>
            <span className="font-jetbrains text-2xl leading-none font-light tracking-tighter text-neutral-900">
              02<span className="text-lg text-neutral-400">/04</span>
            </span>
          </div>
        </div>
      </section>

      {/* Værktøjslinje */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-2.5 font-jetbrains text-xs sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<Viewport>
            value={viewport}
            onChange={setViewport}
            options={[
              { value: "desktop", label: "Desktop", icon: DesktopIcon },
              { value: "mobil", label: "Mobil", icon: MobileIcon },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSaveTemplateOpen(true)}
            disabled={!result || blocks.length === 0}
            className="flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 tracking-wider text-neutral-800 shadow-xs transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveTemplateState === "saved" ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <DocumentIcon className="h-3.5 w-3.5 text-neutral-600" />
            )}
            {saveTemplateState === "saved" ? "Skabelon gemt!" : "Gem som skabelon"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result}
            className="flex items-center gap-1.5 bg-black px-4 py-1.5 font-medium tracking-wider text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {copyState === "copied" ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copyState === "copied" ? "Kopieret!" : copyState === "error" ? "Kunne ikke kopiere" : "Kopiér nyhedsbrev"}
          </button>
        </div>
      </section>

      <main className="flex flex-1 flex-col bg-[#eeeeea] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        {/* Lærred: nyhedsbrevet, altid i preview. Et klik på en blok vælger
            den (se NewsletterCard's onSelectBlock); et klik på selve lærredet
            uden for nyhedsbrevet fravælger igen. overflow-x-auto –
            Desktop-visningen er BEVIDST fast 600px bred (som en rigtig
            e-mail-klient). Ekstra luft i bunden på smal skærm, så det
            nederste af nyhedsbrevet ikke skjules bag bundpanelet. */}
        <section
          aria-label="Nyhedsbrev"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedBlockId(null);
          }}
          className={`min-w-0 overflow-x-auto p-4 md:p-8 ${showEditor ? "pb-28 lg:pb-8" : ""} bg-[#f6f6f4] bg-[radial-gradient(rgba(0,0,0,0.08)_1px,transparent_0)] bg-size-[20px_20px]`}
        >
          {!result ? (
            <div className="flex justify-center">
              <div className="flex max-w-md flex-col gap-3 border border-black/15 bg-white p-6">
                <SectionLabel>Intet nyhedsbrev genereret endnu</SectionLabel>
                <p className="text-sm text-[#71717A]">
                  Gå til Opsætning for at vælge målgruppe og generere nyhedsbrevet, før du kan forhåndsvise eller
                  redigere det her.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/opsaetning")}
                  className="mt-1 inline-flex w-fit items-center gap-2 rounded bg-black px-5 py-2.5 font-jetbrains text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                  Til Opsætning
                </button>
              </div>
            </div>
          ) : isLoadingProducts ? (
            <p className="py-16 text-center font-jetbrains text-xs tracking-wider text-[#71717A] uppercase">
              Henter produkter...
            </p>
          ) : productsError ? (
            <div className="mx-auto flex max-w-md flex-col gap-3 border border-red-200 bg-white p-6">
              <SectionLabel>Kunne ikke hente produkter</SectionLabel>
              <p className="text-sm text-red-600">{productsError}</p>
              <button
                type="button"
                onClick={retryLoadProducts}
                className="w-fit rounded border border-black/20 bg-white px-4 py-2 font-jetbrains text-xs tracking-wider uppercase hover:border-black"
              >
                Prøv igen
              </button>
            </div>
          ) : (
            <div className="flex w-max min-w-full flex-col items-center">
              <div className="mb-2 flex w-full max-w-150 items-center justify-between px-1 font-jetbrains text-[10px] text-neutral-400 uppercase">
                <span>Lærred: e-mail · klik på en blok for at redigere den</span>
                <span>{viewport === "mobil" ? "375" : "600"} x auto</span>
              </div>
              <div className="relative">
                <Crosshairs />
                <NewsletterCard
                  blocks={blocks}
                  image={result.image}
                  customerType={customerType}
                  products={selectedProducts}
                  viewport={viewport}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={selectBlock}
                  getBlockLabel={(block) => getBlockTitle(block.type)}
                />
              </div>
            </div>
          )}
        </section>

        {/* Sidepanel: bloklisten eller den valgte bloks kontroller. På bred
            skærm til højre (klæber, med egen scroll); på smal skærm et
            panel i bunden, der kan foldes ud/ind – kun ét panel ad gangen. */}
        {showEditor && (
          <aside
            aria-label="Redigering af nyhedsbrevet"
            className="fixed inset-x-0 bottom-0 z-30 flex max-h-[65vh] flex-col border-t-2 border-black bg-[#fbfbfa] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:static lg:z-auto lg:max-h-none lg:border-t-0 lg:border-l lg:border-black/10 lg:shadow-none"
          >
            <button
              type="button"
              onClick={() => setIsPanelOpen((open) => !open)}
              aria-expanded={isPanelOpen}
              aria-controls="editor-panel"
              className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 font-jetbrains text-xs font-bold tracking-wider text-neutral-900 uppercase lg:hidden"
            >
              <span className="truncate">
                {selectedBlock ? `Rediger: ${getBlockTitle(selectedBlock.type)}` : "Alle blokke"}
              </span>
              <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${isPanelOpen ? "" : "rotate-180"}`} />
            </button>
            <div
              id="editor-panel"
              className={`${isPanelOpen ? "block" : "hidden"} min-h-0 overflow-y-auto p-4 lg:sticky lg:top-0 lg:block lg:max-h-screen sm:p-5`}
            >
              <EditorBlockList
                blocks={blocks}
                onBlocksChange={setBlocks}
                products={selectedProducts}
                topicMatchedProductIds={topicMatchedProductIds}
                topicSearchTerm={topicSearchTerm}
                customerType={customerType}
                instructions={instructions}
                selectedBlockId={selectedBlock ? selectedBlock.id : null}
                onSelectBlock={selectBlock}
                listFooter={
                  <section aria-label="Inspektør" className="flex flex-col gap-3 border-t border-[#e2e2df] pt-4">
                    <SectionLabel>Inspektør</SectionLabel>
                      <div className="space-y-3 font-jetbrains text-xs">
                        <InspectorCard label="01. Målgruppe" tag={isB2B ? "B2B valgt" : "B2C valgt"}>
                          <div className="font-bold text-neutral-900">{isB2B ? "Erhvervskunder" : "Privatkunder"}</div>
                          <div className="mt-1 font-grotesk text-[11px] text-neutral-600">
                            {isB2B
                              ? "Fagligt, præcist sprog · Fokus på specifikationer og robusthed"
                              : "Tilgængeligt, inspirerende sprog · Fokus på udtryk og haveoplevelse"}
                          </div>
                        </InspectorCard>

                        <InspectorCard label="02. Prisberegning" tag={isB2B ? "Moms: ekskl" : "Moms: inkl"} tagClassName="text-neutral-900">
                          <div className="text-neutral-800">Priser vist {isB2B ? "ekskl." : "inkl."} moms</div>
                          <div className="mt-1 text-[10px] text-neutral-400">Valuta: DKK</div>
                        </InspectorCard>

                        <InspectorCard label="03. AI-instruks">
                          <div className="text-[11px] text-neutral-900">
                            {instructions.trim() ? `"${instructions.trim()}"` : "Ingen instruks angivet"}
                          </div>
                        </InspectorCard>

                        <InspectorCard
                          label="04. Produkter fra databasen"
                          tag={result ? `${selectedProducts.length} matchede` : undefined}
                          tagClassName="text-neutral-900"
                        >
                          <div className="font-medium text-neutral-900">
                            {topicSearchTerm ? `Søgeord: ${topicSearchTerm}` : "Ingen søgning endnu"}
                          </div>
                          <div className="mt-1 text-[10px] text-neutral-500">
                            Klik på en blok i nyhedsbrevet for at vælge, hvilke produkter der vises.
                          </div>
                        </InspectorCard>
                      </div>
                  </section>
                }
              />
            </div>
          </aside>
        )}
      </main>

      {isSaveTemplateOpen && (
        <SaveTemplateDialog onClose={() => setIsSaveTemplateOpen(false)} onSave={handleSaveTemplate} />
      )}
    </StitchShell>
  );
}
