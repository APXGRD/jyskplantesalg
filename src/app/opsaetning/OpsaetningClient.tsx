"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";
import { CustomerTypeCard } from "@/components/CustomerTypeCard";
import { OnlyWithImageCheckbox } from "@/components/OnlyWithImageCheckbox";
import { BoltIcon, ChevronDownIcon, SpinnerIcon } from "@/components/icons";
import type { NewsletterBlock } from "@/lib/newsletterBlocks";
import { useNewsletter, type GeneratedNewsletter } from "@/context/NewsletterContext";
import type { TemplateSummary } from "@/lib/templates";

interface OpsaetningClientProps {
  initialTemplates: TemplateSummary[];
}

export function OpsaetningClient({ initialTemplates }: OpsaetningClientProps) {
  const router = useRouter();
  const {
    customerType,
    setCustomerType,
    instructions,
    setInstructions,
    topicOnlyWithImage,
    setTopicOnlyWithImage,
    selectedTemplateId,
    setSelectedTemplateId,
    setResult,
  } = useNewsletter();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Server-renderet ved sideindlæsning (se opsaetning/page.tsx) – intet
  // klientside mount-fetch for skabelon-dropdownen.
  const [templates] = useState<TemplateSummary[]>(initialTemplates);

  // Det samlede beskrivelsesfelt er den ENESTE vej til at generere et
  // nyhedsbrev – manuelt produktvalg findes ikke længere som et alternativ
  // (se generate-newsletter/route.ts).
  const canGenerate = instructions.trim().length > 0;

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
              <div className="relative max-w-xs">
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
            </section>

            <section className="pt-8">
              <p className="text-xs font-semibold tracking-wide text-ink uppercase">Beskriv dit nyhedsbrev</p>
              <p className="pt-1.5 pb-3 text-xs text-ink-faint">
                Bruges til automatisk at finde matchende produkter, og til at tilpasse AI-tekstens tone, fokus
                og indhold
              </p>
              <div className="flex items-start gap-3">
                <textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="F.eks. 'Lav et nyhedsbrev i en professionel tone til vores erhvervskunder om vores blommetræer'"
                  rows={5}
                  className="flex-1 resize-none rounded-xl border border-border bg-white px-4 py-3.5 text-[13px] text-ink placeholder:text-ink-faintest focus:outline-none"
                />
                <OnlyWithImageCheckbox checked={topicOnlyWithImage} onChange={setTopicOnlyWithImage} />
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
    </div>
  );
}
