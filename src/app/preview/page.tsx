"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { buildNewsletterHtml, buildNewsletterText } from "@/lib/newsletterExport";
import { cropMasonryImagesForExport } from "@/lib/masonryExport";
import { buildTemplateBlockStructure, isBlankContent } from "@/lib/newsletterBlocks";
import { EditorialShell } from "@/components/EditorialShell";
import { NewsletterCard } from "@/components/preview/NewsletterCard";
import { EditorBlockList, getBlockTitle } from "@/components/preview/EditorBlockList";
import { SaveTemplateDialog } from "@/components/preview/SaveTemplateDialog";
import { SendTestMailDialog } from "@/components/preview/SendTestMailDialog";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DesktopIcon,
  DocumentIcon,
  MobileIcon,
  SendIcon,
} from "@/components/icons";
import { useNewsletter } from "@/context/NewsletterContext";
import { useBrandSettings } from "@/context/BrandSettingsContext";

type Viewport = "desktop" | "mobil";
type CopyState = "idle" | "copied" | "error";
type SaveTemplateState = "idle" | "saved";

// Visningsknapperne i værktøjslinjen (Stitch: segmenteret kontrol).
const VIEWPORTS: { value: Viewport; label: string; icon: typeof DesktopIcon }[] = [
  { value: "desktop", label: "Desktop (600px)", icon: DesktopIcon },
  { value: "mobil", label: "Mobil (375px)", icon: MobileIcon },
];

// Handlingerne i værktøjslinjen (Kopiér / Send test-mail / Gem skabelon):
// grøn kant og tekst, fyldt grå med hvid tekst ved hover.
const toolbarActionClassName =
  "inline-flex items-center gap-2 rounded-xs border-[0.5px] border-forest bg-transparent px-3.5 py-2 text-sm text-forest transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-forest disabled:hover:bg-transparent disabled:hover:text-forest";

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
  const [isTestMailOpen, setIsTestMailOpen] = useState(false);
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

  // "Send test-mail": samme HTML og tekst som "Kopiér nyhedsbrev" (inkl.
  // beskårne masonry-billeder), sendt via /api/send-test-mail til én modtager.
  // Emnelinjen er nyhedsbrevets overskrift (ellers "Nyhedsbrev"); serveren
  // sætter "[TEST]" foran. Kaster ved fejl – vises i dialogen.
  async function handleSendTestMail(to: string) {
    if (!result) return;
    const exportBlocks = await cropMasonryImagesForExport(blocks);
    const html = buildNewsletterHtml(exportBlocks, result.image, customerType, selectedProducts, brand);
    const text = buildNewsletterText(exportBlocks, result.image, customerType, selectedProducts, brand);
    const headingBlock = blocks.find(
      (block) => block.type === "overskrift" && !block.hidden && !isBlankContent(block.content),
    );
    const subject = headingBlock?.content?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() || "Nyhedsbrev";
    const response = await fetch("/api/send-test-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, text }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Kunne ikke sende test-mailen. Prøv igen.");
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


  // Editoren (sidepanelet) vises kun, når der er et nyhedsbrev at redigere.
  const showEditor = Boolean(result) && !isLoadingProducts && !productsError;
  // Den valgte blok – kan forsvinde (fx slettet), så slås op hver gang.
  const selectedBlock = selectedBlockId ? blocks.find((block) => block.id === selectedBlockId) : undefined;

  const audienceLabel = customerType === "erhverv" ? "Erhvervskunder (B2B)" : "Privatkunder (B2C)";

  return (
    <EditorialShell active="preview">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-16 md:px-12">
        {/* Titel + status */}
        <section className="flex flex-col justify-between gap-4 pt-8 pb-6 md:flex-row md:items-end">
          <div className="flex flex-col">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-forest" />
              <span className="text-xs font-semibold tracking-widest text-stone uppercase">Trin 02 / Nyhedsbrev</span>
            </div>
            <h1 className="font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-forest md:text-4xl md:leading-[1.25]">
              Preview / Rediger
            </h1>
          </div>
          <span className="text-xs font-semibold tracking-wider text-stone">Målgruppe: {audienceLabel}</span>
        </section>

        {/* Værktøjslinje */}
        <nav
          aria-label="Editor værktøjslinje"
          className="mb-6 flex w-full flex-wrap items-center justify-between gap-4 rounded-sm bg-white p-3 shadow-sm"
        >
          <div role="group" aria-label="Visning" className="flex items-center gap-1 rounded-xs p-1">
            {VIEWPORTS.map(({ value, label, icon: Icon }) => {
              const isActive = viewport === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setViewport(value)}
                  className={`inline-flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-sm tracking-[0.35px] transition-all ${
                    isActive
                      ? "bg-forest text-white hover:bg-plant-hover"
                      : "text-stone hover:bg-plant-hover hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCopy} disabled={!result} className={toolbarActionClassName}>
              {copyState === "copied" ? <CheckIcon className="h-[18px] w-[18px]" /> : <CopyIcon className="h-[18px] w-[18px]" />}
              {copyState === "copied" ? "Kopieret!" : copyState === "error" ? "Kunne ikke kopiere" : "Kopiér nyhedsbrev"}
            </button>
            <button
              type="button"
              onClick={() => setIsTestMailOpen(true)}
              disabled={!result || blocks.length === 0}
              className={toolbarActionClassName}
            >
              <SendIcon className="h-[18px] w-[18px]" />
              Send test-mail
            </button>
            <button
              type="button"
              onClick={() => setIsSaveTemplateOpen(true)}
              disabled={!result || blocks.length === 0}
              className={toolbarActionClassName}
            >
              {saveTemplateState === "saved" ? (
                <CheckIcon className="h-[18px] w-[18px]" />
              ) : (
                <DocumentIcon className="h-[18px] w-[18px]" />
              )}
              {saveTemplateState === "saved" ? "Skabelon gemt!" : "Gem skabelon"}
            </button>
          </div>
        </nav>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
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
            className={`flex min-w-0 flex-col items-center overflow-x-auto px-0 py-8 sm:px-8 lg:items-start lg:px-0 lg:pt-0 ${
              showEditor ? "pb-28 lg:pb-8" : ""
            }`}
          >
            {!result ? (
              <div className="flex w-full max-w-md flex-col gap-3 rounded-sm bg-white p-6 shadow-sm">
                <h2 className="font-garamond text-2xl leading-[1.35] font-medium text-forest">
                  Intet nyhedsbrev genereret endnu
                </h2>
                <p className="text-sm text-stone">
                  Gå til Opsætning for at vælge målgruppe og generere nyhedsbrevet, før du kan forhåndsvise eller
                  redigere det her.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/opsaetning")}
                  className="mt-1 inline-flex w-fit items-center gap-2 rounded-xs bg-forest px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-plant-hover"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Til Opsætning
                </button>
              </div>
            ) : isLoadingProducts ? (
              <p className="py-16 text-sm text-stone">Henter produkter...</p>
            ) : productsError ? (
              <div className="flex w-full max-w-md flex-col gap-3 rounded-sm bg-white p-6 shadow-sm">
                <h2 className="font-garamond text-2xl leading-[1.35] font-medium text-forest">Kunne ikke hente produkter</h2>
                <p className="text-sm text-red-700">{productsError}</p>
                <button
                  type="button"
                  onClick={retryLoadProducts}
                  className="w-fit rounded-xs border border-forest px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white"
                >
                  Prøv igen
                </button>
              </div>
            ) : (
              <div className="flex w-max min-w-full flex-col items-center lg:items-start">
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
                <p className={`mt-4 text-xs text-stone ${viewport === "mobil" ? "w-[375px]" : "w-[600px]"}`}>
                  {viewport === "mobil" ? "Mobil bredde 375px" : "Standard bredde 600px"} · klik på en sektion for at
                  redigere den
                </p>
              </div>
            )}
          </section>

          {/* Sidepanel: kortene med AI-tekst, typografi og sektioner – eller
              den valgte bloks kontroller. På bred skærm til højre; på smal
              skærm et panel i bunden, der kan foldes ud/ind. */}
          {showEditor && (
            <aside
              aria-label="Redigering af nyhedsbrevet"
              className="fixed inset-x-0 bottom-0 z-30 flex max-h-[65vh] flex-col border-t border-hairline bg-plant-bg shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:static lg:z-auto lg:max-h-none lg:border-t-0 lg:bg-transparent lg:shadow-none"
            >
              <button
                type="button"
                onClick={() => setIsPanelOpen((open) => !open)}
                aria-expanded={isPanelOpen}
                aria-controls="editor-panel"
                className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 text-sm font-medium text-forest lg:hidden"
              >
                <span className="truncate">
                  {selectedBlock ? `Rediger: ${getBlockTitle(selectedBlock.type)}` : "Alle sektioner"}
                </span>
                <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${isPanelOpen ? "" : "rotate-180"}`} />
              </button>
              <div
                id="editor-panel"
                className={`${isPanelOpen ? "block" : "hidden"} min-h-0 overflow-y-auto p-4 lg:block lg:overflow-visible lg:p-0`}
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
                />
              </div>
            </aside>
          )}
        </div>
      </main>

      {isTestMailOpen && (
        <SendTestMailDialog onClose={() => setIsTestMailOpen(false)} onSend={handleSendTestMail} />
      )}

      {isSaveTemplateOpen && (
        <SaveTemplateDialog onClose={() => setIsSaveTemplateOpen(false)} onSave={handleSaveTemplate} />
      )}
    </EditorialShell>
  );
}
