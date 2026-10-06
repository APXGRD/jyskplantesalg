"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionLabel, StitchShell } from "@/components/StitchShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ChevronDownIcon, SpinnerIcon, TrashIcon } from "@/components/icons";
import { BLANK_NEWSLETTER, createBlankBlocks, type NewsletterBlock } from "@/lib/newsletterBlocks";
import { useNewsletter, type GeneratedNewsletter } from "@/context/NewsletterContext";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import type { TemplateSummary } from "@/lib/templates";

interface OpsaetningClientProps {
  initialTemplates: TemplateSummary[];
  initialPlantForms: string[];
}

function AudienceCard({
  title,
  badge,
  description,
  selected,
  onSelect,
}: {
  title: string;
  badge: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-col rounded-md border p-5 text-left transition-all ${
        selected
          ? "border-black bg-[#141414] text-white shadow-lg"
          : "border-black/10 bg-white hover:border-black/30"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full ${
              selected ? "border-2 border-white p-0.5" : "border border-black/30"
            }`}
          >
            {selected && <span className="h-full w-full rounded-full bg-white" />}
          </span>
          <span className="text-base font-bold tracking-tight">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {selected && (
            <span className="rounded bg-white px-2 py-0.5 font-jetbrains text-[9px] font-semibold tracking-wider text-black uppercase">
              Valgt
            </span>
          )}
          <span
            className={`rounded border px-2 py-0.5 font-jetbrains text-[9px] uppercase ${
              selected ? "border-white/20 text-neutral-300" : "border-black/10 bg-[#F8F8F8] text-[#71717A]"
            }`}
          >
            {badge}
          </span>
        </div>
      </div>
      <p className={`text-xs leading-relaxed ${selected ? "text-neutral-300" : "text-[#71717A]"}`}>{description}</p>
    </button>
  );
}

// Planteform-rækker: synlig, native checkbox (ikke sr-only – en sr-only-
// input uden nær positioneret forælder har tidligere oppustet hele sidens
// scrollhøjde, se git-historikken).
function PlantFormRow({ checked, onChange, label, tag }: { checked: boolean; onChange: () => void; label: string; tag?: string }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded border p-2 transition-colors ${
        checked ? "border-black/10 bg-white" : "border-transparent hover:bg-white/60"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-black" />
      <span className={checked ? "font-medium text-black" : "text-neutral-700"}>{label}</span>
      {tag && <span className="ml-auto text-[10px] text-[#71717A]">{tag}</span>}
    </label>
  );
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
    topicMaxPrice,
    topicPlantForm,
    setTopicPlantForm,
    topicMaxResults,
    setTopicMaxResults,
    selectedTemplateId,
    setSelectedTemplateId,
    setResult,
  } = useNewsletter();
  // Kun til "Blank skabelon": tekst-blokkene starter med kundens egen
  // skrifttype/farve, ligesom et AI-genereret nyhedsbrev.
  const brand = useBrandSettings();

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
  // Søgestatus-kortet viser kun et tal, når der er en beskrivelse at søge
  // på – ellers "Afventer" i stedet for et forvirrende "0 produkter".
  const showMatchCountNote = canGenerate && topicTotalMatchCount !== null;

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


  // "Blank skabelon": et nyhedsbrev med tomme pladsholder-blokke, som
  // brugeren selv udfylder og bygger videre på i Edit-mode – ingen AI-kald, ingen
  // produktsøgning, ingen data. setResult med færdige blokke springer al
  // produkt-opslag over (se NewsletterContext.setResult).
  function handleBlankTemplate() {
    setError(null);
    void setResult(
      BLANK_NEWSLETTER,
      createBlankBlocks({ primaryColor: brand.colors[0], primaryFont: brand.primaryFont }),
    );
    router.push("/preview");
  }

  const audienceLabel = customerType === "erhverv" ? "Erhverv (B2B)" : "Privat (B2C)";
  const visibleCount =
    topicTotalMatchCount !== null && hasValidMaxResults
      ? Math.min(parsedMaxResults, topicTotalMatchCount)
      : topicTotalMatchCount;

  return (
    <StitchShell active="settings">

          <main className="grid flex-1 grid-cols-1 divide-y divide-black/10 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
            {/* Venstre kolonne: målgruppe, skabelon, beskrivelse, generér */}
            <div className="flex flex-col divide-y divide-black/10 lg:col-span-8">
              <div className="bg-white/40 px-4 py-7 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1.5 font-jetbrains text-[10px] tracking-widest text-[#71717A] uppercase">
                      Trin 01 <span className="text-black/30">/</span> Nyhedsbrev
                    </div>
                    <h1 className="text-4xl font-bold tracking-[-0.04em] uppercase sm:text-5xl">Opsætning</h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71717A]">
                      Angiv målgruppe og eventuelle særlige instrukser til AI-genereringen af nyhedsbrevet.
                    </p>
                  </div>
                  <div className="hidden flex-col items-end text-right font-jetbrains sm:flex">
                    <span className="text-3xl font-light tracking-tighter text-black/90">
                      01<span className="text-black/30">/04</span>
                    </span>
                    <span className="text-[9px] tracking-widest text-[#71717A] uppercase">
                      Status: {canGenerate ? "Klar til generering" : "Afventer beskrivelse"}
                    </span>
                  </div>
                </div>
              </div>

              <section className="space-y-4 bg-white/20 p-4 sm:p-8">
                <SectionLabel>01. Målgruppe</SectionLabel>
                <div role="radiogroup" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <AudienceCard
                    title="Privatkunder"
                    badge="B2C"
                    description="Priser inkl. moms · Tilgængeligt, inspirerende sprog · Fokus på udtryk og haveoplevelse"
                    selected={customerType === "privat"}
                    onSelect={() => setCustomerType("privat")}
                  />
                  <AudienceCard
                    title="Erhvervskunder"
                    badge="B2B"
                    description="Priser ekskl. moms · Fagligt, præcist sprog · Fokus på specifikationer og robusthed"
                    selected={customerType === "erhverv"}
                    onSelect={() => setCustomerType("erhverv")}
                  />
                </div>
              </section>

              <section className="space-y-3 bg-white/10 p-4 sm:p-8">
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>02. Skabelon</SectionLabel>
                  <span className="font-jetbrains text-[10px] text-[#71717A] uppercase">Layout</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedTemplateId ?? ""}
                      onChange={(event) => setSelectedTemplateId(event.target.value || null)}
                      className="w-full cursor-pointer appearance-none rounded border border-black/15 bg-white px-4 py-3.5 pr-10 text-sm font-medium tracking-tight text-black transition-colors hover:border-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                    >
                      <option value="">Standard layout</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-3.5 w-3.5 -translate-y-1/2 text-black" />
                  </div>
                  {selectedTemplate && (
                    <button
                      type="button"
                      onClick={handleDeleteTemplate}
                      aria-label={`Slet skabelonen ${selectedTemplate.name}`}
                      title="Slet skabelon"
                      className="flex h-12.5 w-12.5 shrink-0 items-center justify-center rounded border border-black/15 bg-white text-[#71717A] transition-colors hover:border-black hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {deleteError && <p className="text-[12px] text-red-600">{deleteError}</p>}
              </section>

              <section className="flex flex-1 flex-col space-y-3 bg-white/40 p-4 sm:p-8">
                <SectionLabel>03. Beskriv dit nyhedsbrev</SectionLabel>
                <div className="relative flex flex-1 flex-col overflow-hidden rounded border border-black/20 bg-white shadow-sm focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-[#FBFBFB] px-4 py-2 font-jetbrains text-[10px] text-[#71717A] uppercase">
                    <span>Input: Fritekst til AI</span>
                    <span className="font-medium text-neutral-500">Målgruppe: {audienceLabel}</span>
                  </div>
                  <textarea
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="F.eks. 'Lav et nyhedsbrev i en professionel tone til vores erhvervskunder om vores blommetræer'"
                    rows={5}
                    className="min-h-32 w-full flex-1 resize-none border-0 bg-transparent p-4 font-jetbrains text-sm leading-relaxed text-black placeholder:text-neutral-400 focus:ring-0 focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-[#F9F9F9] px-4 py-2.5 font-jetbrains text-[11px]">
                    <div className="flex items-center gap-1.5 text-neutral-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
                      <span>Teksten bruges både som søgning og som AI-instruks</span>
                    </div>
                    <div className="tracking-wider text-neutral-500">
                      <span className="font-semibold text-black">{instructions.length}</span> anslag
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="inline-flex items-center gap-3 rounded bg-black px-7 py-4 font-jetbrains text-xs font-semibold tracking-wider text-white uppercase shadow-md transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none disabled:active:scale-100"
                  >
                    {isGenerating && <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />}
                    {isGenerating ? "Genererer..." : "Generér nyhedsbrev"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBlankTemplate}
                    disabled={isGenerating}
                    title="Start med et tomt nyhedsbrev og byg det selv fra bunden – uden AI og uden produktdata"
                    className="inline-flex items-center gap-3 rounded border border-neutral-300 bg-white px-7 py-4 font-jetbrains text-xs font-semibold tracking-wider text-black uppercase shadow-sm transition-all hover:border-black hover:bg-neutral-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Blank skabelon
                  </button>
                  {!canGenerate && (
                    <p className="font-jetbrains text-[11px] text-[#71717A]">
                      Beskriv dit nyhedsbrev ovenfor, før du kan generere det.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Højre kolonne: filtrering + søgestatus */}
            <aside className="flex flex-col divide-y divide-black/10 bg-[#F8F8F8] lg:col-span-4">
              <div className="bg-white/70 p-4 sm:p-6">
                <SectionLabel>Filtrering</SectionLabel>
                <p className="mt-2 text-xs leading-tight text-[#71717A]">
                  Udvælg hvilke planter der skal indgå i nyhedsbrevet.
                </p>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="font-jetbrains text-xs font-bold tracking-wider text-black uppercase">Planteform</span>
                  <button
                    type="button"
                    onClick={() => setTopicPlantForm("")}
                    className="font-jetbrains text-[10px] text-[#71717A] uppercase underline hover:text-black"
                  >
                    Nulstil
                  </button>
                </div>
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1 font-jetbrains text-xs">
                  <PlantFormRow
                    checked={topicPlantForm === ""}
                    onChange={() => setTopicPlantForm("")}
                    label="Alle planteformer"
                    tag="ALT"
                  />
                  {plantForms.map((form) => (
                    <PlantFormRow
                      key={form}
                      checked={topicPlantForm === form}
                      onChange={() => setTopicPlantForm(form)}
                      label={form}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-5 bg-white/40 p-4 sm:p-6">
                <span className="block font-jetbrains text-xs font-bold tracking-wider text-black uppercase">
                  Visningsregler
                </span>
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-xs font-medium text-neutral-800">Kun med billede</span>
                  <input
                    type="checkbox"
                    checked={topicOnlyWithImage}
                    onChange={(event) => setTopicOnlyWithImage(event.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                </label>
                <div>
                  <label htmlFor="topic-max-results" className="mb-2 block text-xs font-medium text-neutral-800">
                    Antal produkter
                  </label>
                  <input
                    id="topic-max-results"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={topicMaxResults}
                    onChange={(event) => setTopicMaxResults(event.target.value)}
                    className="w-full rounded border border-black/20 bg-white px-3 py-2 font-jetbrains text-sm font-semibold text-black focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#EFEFEF] p-4 sm:p-6">
                <div className="flex flex-col gap-2 rounded border border-black/15 bg-white p-4">
                  <div className="flex items-center justify-between font-jetbrains text-[10px] text-[#71717A] uppercase">
                    <span>Søgestatus</span>
                    {!showMatchCountNote ? (
                      <span>Afventer</span>
                    ) : topicTotalMatchCount === 0 ? (
                      <span className="font-bold text-red-600">Ingen match</span>
                    ) : (
                      <span className="font-bold text-emerald-600">Match fundet</span>
                    )}
                  </div>
                  <div className="font-jetbrains text-sm font-bold tracking-tight">
                    {showMatchCountNote ? `${topicTotalMatchCount} produkter fundet` : "Beskriv nyhedsbrevet for at søge"}
                  </div>
                  {showMatchCountNote && topicTotalMatchCount !== 0 && (
                    <div className="flex justify-between border-t border-black/5 pt-2 font-jetbrains text-[11px] text-[#71717A]">
                      <span>Vises i nyhedsbrevet:</span>
                      <span className="font-semibold text-black">De første {visibleCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </main>

      {deleteTarget && (
        <ConfirmDialog
          title="Slet skabelon"
          description={`Slet skabelonen "${deleteTarget.name}"? Dette kan ikke fortrydes.`}
          confirmLabel="Slet"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </StitchShell>
  );
}
