"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";
import { CustomerTypeCard } from "@/components/CustomerTypeCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OnlyWithImageCheckbox } from "@/components/OnlyWithImageCheckbox";
import { BoltIcon, ChevronDownIcon, SpinnerIcon, TrashIcon } from "@/components/icons";
import type { NewsletterBlock } from "@/lib/newsletterBlocks";
import { useNewsletter, type GeneratedNewsletter } from "@/context/NewsletterContext";
import type { TemplateSummary } from "@/lib/templates";

interface OpsaetningClientProps {
  initialTemplates: TemplateSummary[];
  initialPlantForms: string[];
}

export function OpsaetningClient({ initialTemplates, initialPlantForms }: OpsaetningClientProps) {
  const router = useRouter();
  const {
    customerType,
    setCustomerType,
    instructions,
    setInstructions,
    topicOnlyWithImage,
    setTopicOnlyWithImage,
    topicMinPrice,
    setTopicMinPrice,
    topicMaxPrice,
    setTopicMaxPrice,
    topicPlantForm,
    setTopicPlantForm,
    topicMaxResults,
    setTopicMaxResults,
    selectedTemplateId,
    setSelectedTemplateId,
    setResult,
  } = useNewsletter();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Server-renderet ved sideindlæsning (se opsaetning/page.tsx) – intet
  // klientside mount-fetch for skabelon-dropdownen ved almindelig
  // sideindlæsning. Skal dog kunne opdateres lokalt (setTemplates), så en
  // slettet skabelon forsvinder fra listen med det samme, uden en
  // genindlæsning af siden.
  const [templates, setTemplates] = useState<TemplateSummary[]>(initialTemplates);
  // Samme server-renderede mønster som templates ovenfor – planteform-listen
  // ændrer sig ikke i løbet af selve besøget (kun ved en fremtidig
  // produkt-synkronisering), så ingen setter er nødvendig her.
  const [plantForms] = useState<string[]>(initialPlantForms);
  // Skabelonen, der venter på bekræftelse af sletning i ConfirmDialog
  // herunder – altid den AKTUELT valgte skabelon (sletteknappen findes kun
  // ved siden af selve dropdown'en, ikke pr. liste-punkt), se
  // handleDeleteTemplate.
  const [deleteTarget, setDeleteTarget] = useState<TemplateSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Det FULDE (ufiltrerede af maxResults) antal produkter, der matcher de
  // nuværende filtre – null, indtil den første optælling er kommet tilbage
  // (eller feltet er tomt, se effekten herunder). Bruges UDELUKKENDE til
  // "X produkter matcher, viser de første N"-noten ved siden af "Maks. antal
  // produkter"-feltet; selve genereringen bruger IKKE denne værdi, kun sin
  // egen friske søgning server-side (se generate-newsletter/route.ts).
  const [topicTotalMatchCount, setTopicTotalMatchCount] = useState<number | null>(null);

  // Det samlede beskrivelsesfelt er den ENESTE vej til at generere et
  // nyhedsbrev – manuelt produktvalg findes ikke længere som et alternativ
  // (se generate-newsletter/route.ts).
  const canGenerate = instructions.trim().length > 0;
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  // Debounceret, LIVE optælling af det fulde antal matchende produkter (før
  // "Maks. antal produkter" afskærer noget) – opdateres, mens brugeren
  // stadig redigerer felterne, i stedet for kun at kunne ses efter en hel
  // generering (som i forvejen navigerer væk fra siden med det samme ved
  // succes, se handleGenerate). Kalder /api/products/topic-match-count, som
  // kører NØJAGTIG samme søgning/filtre, blot uden AI og uden afskæring.
  useEffect(() => {
    const trimmedInstructions = instructions.trim();
    if (!trimmedInstructions) {
      return;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/products/topic-match-count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instructions: trimmedInstructions,
            topicOnlyWithImage,
            topicMinPrice: topicMinPrice.trim() ? Number(topicMinPrice) : undefined,
            topicMaxPrice: topicMaxPrice.trim() ? Number(topicMaxPrice) : undefined,
            topicPlantForm: topicPlantForm || undefined,
          }),
        });
        if (cancelled || !response.ok) return;
        const data = await response.json();
        if (!cancelled && typeof data.totalMatchCount === "number") {
          setTopicTotalMatchCount(data.totalMatchCount);
        }
      } catch {
        // Ignoreres bevidst – noten er informativ, ikke kritisk for selve
        // genereringen, som stadig kører sin egen, friske søgning.
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [instructions, topicOnlyWithImage, topicMinPrice, topicMaxPrice, topicPlantForm]);

  const parsedMaxResults = topicMaxResults.trim() ? Number(topicMaxResults) : NaN;
  const hasValidMaxResults = Number.isFinite(parsedMaxResults) && parsedMaxResults >= 1;
  // Vises ALTID (ikke kun når grænsen reelt afskærer noget), så feltet ét
  // sted uden filter (tomt tekstfelt) forbliver tydeligt "intet at vise" –
  // IKKE et forvirrende "0 produkter matcher" for et filter, brugeren slet
  // ikke er i gang med at bruge endnu. Selve teksten har tre varianter
  // (se matchCountText herunder): "0 produkter matcher", "N produkter
  // matcher" (inden for grænsen), og "N produkter matcher, viser de første
  // M" (grænsen afskærer reelt noget).
  const showMatchCountNote = canGenerate && topicTotalMatchCount !== null;
  const matchCountText = (() => {
    if (topicTotalMatchCount === null) return "";
    if (topicTotalMatchCount === 0) return "0 produkter matcher";
    if (hasValidMaxResults && topicTotalMatchCount > parsedMaxResults) {
      return `${topicTotalMatchCount} produkter matcher, viser de første ${parsedMaxResults}`;
    }
    return `${topicTotalMatchCount} produkter matcher`;
  })();

  function handleDeleteTemplate() {
    if (!selectedTemplate) return;
    setDeleteError(null);
    setDeleteTarget(selectedTemplate);
  }

  // Fjerner skabelonen fra dropdown-listen og nulstiller valget til
  // "Standard layout" MED DET SAMME (optimistisk) – ruller begge dele
  // tilbage, hvis selve DELETE-kaldet fejler, så UI'et aldrig lyver om et
  // gennemført resultat, en skabelon Supabase rent faktisk stadig har.
  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setTemplates((current) => current.filter((template) => template.id !== target.id));
    if (selectedTemplateId === target.id) {
      setSelectedTemplateId(null);
    }
    try {
      const response = await fetch(`/api/templates/${target.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Kunne ikke slette skabelonen. Prøv igen.");
      }
    } catch (err) {
      setTemplates((current) => [...current, target]);
      setSelectedTemplateId(target.id);
      setDeleteError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    }
  }

  async function handleGenerate() {
    if (!canGenerate || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType,
          instructions: instructions.trim() || undefined,
          templateId: selectedTemplateId,
          topicOnlyWithImage,
          topicMinPrice: topicMinPrice.trim() ? Number(topicMinPrice) : undefined,
          topicMaxPrice: topicMaxPrice.trim() ? Number(topicMaxPrice) : undefined,
          topicPlantForm: topicPlantForm || undefined,
          topicMaxResults: topicMaxResults.trim() ? Number(topicMaxResults) : undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Kunne ikke generere nyhedsbrevet. Prøv igen.");
      }

      // `blocks` er kun med i svaret, når en skabelon blev anvendt server-side
      // (se generate-newsletter/route.ts) – ellers bygger setResult selv
      // blocks-listen via createDefaultBlocks, som hidtil. `matchedProductIds`/
      // `topicSearchTerm` er altid med (enhver generering er nu en
      // fritekst-søgning) – HELE det matchede produkt-sæt hhv. de
      // bekræftet-matchende søgeord, se NewsletterContext.setResult.
      // `seedProductIds` er de FØRSTE N (maks.-antal-grænsen) af
      // matchedProductIds – bruges KUN til selve den initiale blok-
      // opbygning (se setResult), IKKE gemt nogen steder i context'en.
      const {
        blocks,
        matchedProductIds,
        topicSearchTerm,
        seedProductIds,
        ...data
      }: GeneratedNewsletter & {
        blocks?: NewsletterBlock[];
        matchedProductIds?: string[];
        topicSearchTerm?: string;
        seedProductIds?: string[];
      } = await response.json();
      setResult(data, blocks, matchedProductIds, topicSearchTerm, seedProductIds);
      router.push("/preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="settings" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader
          title="Opsætning"
          subtitle="Angiv målgruppe og evt. særlige instrukser til AI-genereringen"
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex max-w-xl flex-col">
            <section>
              <p className="text-xs font-semibold tracking-wide text-ink uppercase">Målgruppe</p>
              <div className="grid grid-cols-2 gap-4 pt-3">
                <CustomerTypeCard
                  title="Privatkunder"
                  description="Priser inkl. moms · Tilgængeligt, inspirerende sprog · Fokus på udtryk og haveoplevelse"
                  selected={customerType === "privat"}
                  onSelect={() => setCustomerType("privat")}
                />
                <CustomerTypeCard
                  title="Erhvervskunder"
                  description="Priser ekskl. moms · Fagligt, præcist sprog · Fokus på specifikationer og robusthed"
                  selected={customerType === "erhverv"}
                  onSelect={() => setCustomerType("erhverv")}
                />
              </div>
            </section>

            <section className="pt-8">
              <p className="text-xs font-semibold tracking-wide text-ink uppercase">Skabelon</p>
              <p className="pt-1.5 pb-3 text-xs text-ink-faint">
                Genbrug en gemt blok-opbygning og styling, eller behold standard-layoutet
              </p>
              <div className="flex items-center gap-2">
                <div className="relative max-w-xs flex-1">
                  <select
                    value={selectedTemplateId ?? ""}
                    onChange={(event) => setSelectedTemplateId(event.target.value || null)}
                    className="w-full appearance-none rounded-lg border border-border bg-white px-4 py-2.5 pr-8 text-[13px] text-ink focus:outline-none"
                  >
                    <option value="">Standard layout</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-ink-muted" />
                </div>
                {selectedTemplate && (
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    aria-label={`Slet skabelonen ${selectedTemplate.name}`}
                    title="Slet skabelon"
                    className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg border border-border text-ink-faintest hover:bg-surface-active hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {deleteError && <p className="pt-2 text-[12px] text-red-600">{deleteError}</p>}
            </section>

            <section className="pt-8">
              <p className="text-xs font-semibold tracking-wide text-ink uppercase">Beskriv dit nyhedsbrev</p>
              <p className="pt-1.5 pb-3 text-xs text-ink-faint">
                Bruges til automatisk at finde matchende produkter, og til at tilpasse AI-tekstens tone, fokus
                og indhold
              </p>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="F.eks. 'Lav et nyhedsbrev i en professionel tone til vores erhvervskunder om vores blommetræer'"
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-white px-4 py-3.5 text-[13px] text-ink placeholder:text-ink-faintest focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-selected px-4 py-3">
                <OnlyWithImageCheckbox checked={topicOnlyWithImage} onChange={setTopicOnlyWithImage} />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={topicMinPrice}
                  onChange={(event) => setTopicMinPrice(event.target.value)}
                  placeholder="Min. pris"
                  className="w-23 rounded-lg border border-border bg-white px-2.5 py-2 text-[13px] text-ink placeholder:text-ink-faintest focus:outline-none"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={topicMaxPrice}
                  onChange={(event) => setTopicMaxPrice(event.target.value)}
                  placeholder="Maks. pris"
                  className="w-23 rounded-lg border border-border bg-white px-2.5 py-2 text-[13px] text-ink placeholder:text-ink-faintest focus:outline-none"
                />
                <div className="relative">
                  <select
                    value={topicPlantForm}
                    onChange={(event) => setTopicPlantForm(event.target.value)}
                    className="w-40 appearance-none rounded-lg border border-border bg-white px-3 py-2 pr-7 text-[13px] text-ink focus:outline-none"
                  >
                    <option value="">Alle planteformer</option>
                    {plantForms.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-ink-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="topic-max-results" className="text-[13px] text-ink-faint whitespace-nowrap">
                    Maks. antal produkter
                  </label>
                  <input
                    id="topic-max-results"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={topicMaxResults}
                    onChange={(event) => setTopicMaxResults(event.target.value)}
                    className="w-20 rounded-lg border border-border bg-white px-2.5 py-2 text-[13px] text-ink focus:outline-none"
                  />
                </div>
                {showMatchCountNote && (
                  <p
                    className={`w-full text-[12px] ${topicTotalMatchCount === 0 ? "text-red-600" : "text-ink-faint"}`}
                  >
                    {matchCountText}
                  </p>
                )}
              </div>
            </section>

            {error && <p className="pt-4 text-sm text-red-600">{error}</p>}

            <div className="pt-8">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-100"
              >
                {isGenerating ? (
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BoltIcon className="h-3.5 w-3.5" />
                )}
                {isGenerating ? "Genererer..." : "Generér nyhedsbrev"}
              </button>
              {!canGenerate && (
                <p className="pt-2 text-xs text-ink-faint">
                  Beskriv dit nyhedsbrev ovenfor, før du kan generere det.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Slet skabelon"
          description={`Slet skabelonen "${deleteTarget.name}"? Dette kan ikke fortrydes.`}
          confirmLabel="Slet"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
