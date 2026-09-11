"use client";

import { useState } from "react";
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

  // Det samlede beskrivelsesfelt er den ENESTE vej til at generere et
  // nyhedsbrev – manuelt produktvalg findes ikke længere som et alternativ
  // (se generate-newsletter/route.ts).
  const canGenerate = instructions.trim().length > 0;
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

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
      const {
        blocks,
        matchedProductIds,
        topicSearchTerm,
        ...data
      }: GeneratedNewsletter & {
        blocks?: NewsletterBlock[];
        matchedProductIds?: string[];
        topicSearchTerm?: string;
      } = await response.json();
      setResult(data, blocks, matchedProductIds, topicSearchTerm);
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
