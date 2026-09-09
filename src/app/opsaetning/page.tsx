"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";
import { CustomerTypeCard } from "@/components/CustomerTypeCard";
import { BoltIcon, ChevronDownIcon, SpinnerIcon } from "@/components/icons";
import type { NewsletterBlock } from "@/lib/newsletterBlocks";
import { useNewsletter, type GeneratedNewsletter } from "@/context/NewsletterContext";

interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
}

export default function OpsaetningPage() {
  const router = useRouter();
  const {
    selectedProductIds,
    customerType,
    setCustomerType,
    instructions,
    setInstructions,
    selectedTemplateId,
    setSelectedTemplateId,
    setResult,
  } = useNewsletter();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  const hasSelectedProducts = selectedProductIds.length > 0;

  // Henter listen af gemte skabeloner til dropdownen. Fejler kaldet (fx
  // Supabase midlertidigt utilgængelig), degraderer siden blot roligt til
  // kun at vise "Standard layout" i stedet for at blokere resten af
  // Opsætnings-siden – dropdownen er ikke kritisk for selve generereingen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/templates");
        const data = await response.json();
        if (!cancelled && response.ok && Array.isArray(data)) {
          setTemplates(data);
        }
      } catch {
        // Ignoreres bevidst – se kommentaren ovenfor.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    if (!hasSelectedProducts || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProductIds,
          customerType,
          instructions: instructions.trim() || undefined,
          templateId: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Kunne ikke generere nyhedsbrevet. Prøv igen.");
      }

      // `blocks` er kun med i svaret, når en skabelon blev anvendt server-side
      // (se generate-newsletter/route.ts) – ellers bygger setResult selv
      // blocks-listen via createDefaultBlocks, som hidtil.
      const { blocks, ...data }: GeneratedNewsletter & { blocks?: NewsletterBlock[] } = await response.json();
      setResult(data, blocks);
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
              <p className="text-xs font-semibold tracking-wide text-ink uppercase">
                Yderligere instrukser
              </p>
              <p className="pt-1.5 pb-3 text-xs text-ink-faint">
                Valgfrit – tilpas AI-tekstens tone, fokus og indhold
              </p>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="F.eks. 'Skriv i en vidende, professionel tone – og fremhæv gerne plantens robusthed og kvalitet'"
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-white px-4 py-3.5 text-[13px] text-ink placeholder:text-ink-faintest focus:outline-none"
              />
            </section>

            {error && <p className="pt-4 text-sm text-red-600">{error}</p>}

            <div className="pt-8">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!hasSelectedProducts || isGenerating}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-100"
              >
                {isGenerating ? (
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BoltIcon className="h-3.5 w-3.5" />
                )}
                {isGenerating ? "Genererer..." : "Generér nyhedsbrev"}
              </button>
              {!hasSelectedProducts && (
                <p className="pt-2 text-xs text-ink-faint">
                  Vælg mindst ét produkt på forrige side, før du kan generere nyhedsbrevet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
