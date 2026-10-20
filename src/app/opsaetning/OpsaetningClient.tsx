"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EditorialShell } from "@/components/EditorialShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CheckCircleIcon, FilterIcon, SpinnerIcon, TrashIcon } from "@/components/icons";
import { BLANK_NEWSLETTER, createBlankBlocks, type NewsletterBlock } from "@/lib/newsletterBlocks";
import { useNewsletter, type GeneratedNewsletter } from "@/context/NewsletterContext";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import type { TemplateSummary } from "@/lib/templates";

interface OpsaetningClientProps {
  initialTemplates: TemplateSummary[];
  initialPlantForms: string[];
}

// Et nummereret trin i Stitch-designet: kort med hårfin kant, kursivt
// nummer i EB Garamond, titel og en lille etiket til højre.
function StepSection({
  number,
  title,
  label,
  children,
}: {
  number: string;
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-hairline p-5 sm:p-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-garamond text-2xl leading-[1.35] font-medium text-sage italic">{number}</span>
          <h2 className="text-lg leading-[1.4] font-medium text-forest">{title}</h2>
        </div>
        <span className="hidden text-xs font-semibold tracking-[0.12em] text-stone sm:inline">{label}</span>
      </div>
      {children}
    </section>
  );
}

function AudienceCard({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
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
      className={`flex flex-col rounded-sm bg-white p-4 text-left transition-all duration-200 ${
        selected ? "border-2 border-forest" : "border border-hairline hover:border-sage"
      }`}
    >
      <span className="flex items-center justify-between">
        <span className="text-lg leading-[1.4] font-medium text-forest">{title}</span>
        {selected ? (
          <CheckCircleIcon className="h-5 w-5 text-forest" />
        ) : (
          <span aria-hidden className="mr-[1.5px] size-[17px] rounded-full border-2 border-hairline" />
        )}
      </span>
      <span className="mt-1 text-sm text-stone">{description}</span>
      <span aria-hidden className="mt-4 border-t border-hairline pt-1" />
    </button>
  );
}

// Afbryder (Stitch "role=switch") – en native checkbox under overfladen, så
// den kan betjenes med tastatur og skærmlæser.
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex h-6 w-12 shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-full bg-[#e4e2dd] transition-colors duration-200 checked:bg-forest focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2 focus-visible:outline-none"
      />
      <span className="pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-6" />
    </span>
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

  const visibleCount =
    topicTotalMatchCount !== null && hasValidMaxResults
      ? Math.min(parsedMaxResults, topicTotalMatchCount)
      : topicTotalMatchCount;

  const audienceLabel = customerType === "erhverv" ? "Erhvervskunder (B2B)" : "Privatkunder (B2C)";

  return (
    <EditorialShell active="settings">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-12 md:px-12">
        {/* Titel + status */}
        <header className="flex flex-col justify-between gap-4 border-b border-hairline py-8 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-stone">
              <span className="text-xs font-semibold tracking-[0.12em] text-sage uppercase">Trin 01 / Nyhedsbrev</span>
              <span className="text-hairline">/</span>
              <span className="text-sm">Konfiguration &amp; Kuratering</span>
            </div>
            <h1 className="font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-forest md:text-4xl md:leading-[1.25]">
              Opsætning
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-xs font-semibold tracking-[0.12em] text-stone uppercase">Målgruppe</span>
              <span className="text-sm font-medium text-forest">{audienceLabel}</span>
            </div>
            <div className="hidden h-8 w-px bg-hairline sm:block" />
            <span className="inline-flex items-center rounded-xs bg-mint px-2 py-1 text-xs font-semibold tracking-[0.12em] text-forest-hover">
              {canGenerate ? "Klar til generering" : "Afventer beskrivelse"}
            </span>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Venstre: trinene */}
          <div className="flex flex-col gap-12 lg:col-span-7 xl:col-span-8">
            <StepSection number="01" title="Målgruppe & Momsforhold" label="Segmentering">
              <div role="radiogroup" aria-label="Målgruppe" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AudienceCard
                  title="Privatkunder"
                  description="Priser inkl. moms"
                  selected={customerType === "privat"}
                  onSelect={() => setCustomerType("privat")}
                />
                <AudienceCard
                  title="Erhvervskunder"
                  description="Priser ekskl. moms"
                  selected={customerType === "erhverv"}
                  onSelect={() => setCustomerType("erhverv")}
                />
              </div>
            </StepSection>

            <StepSection number="02" title="Skabelon & Æstetik" label="Layout">
              <div className="flex flex-col justify-between gap-4 rounded-sm border border-hairline p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-semibold tracking-wide text-forest uppercase">
                    {selectedTemplate ? selectedTemplate.name : "Standard layout"}
                  </span>
                  <p className="mt-0.5 text-sm text-stone">
                    {selectedTemplate
                      ? selectedTemplate.description?.trim() || "Gemt skabelon."
                      : "Appens standardopbygning af nyhedsbrevet."}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* "Skift": den native skabelon-vælger ligger usynligt ovenpå
                      knappen, så et klik åbner listen over gemte skabeloner. */}
                  <span className="relative inline-flex rounded-xs border border-forest px-4 py-2 text-sm font-medium text-forest transition-colors focus-within:ring-2 focus-within:ring-forest/30 hover:border-plant-hover hover:bg-plant-hover hover:text-white">
                    Skift
                    <select
                      aria-label="Skift skabelon"
                      value={selectedTemplateId ?? ""}
                      onChange={(event) => setSelectedTemplateId(event.target.value || null)}
                      className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                    >
                      <option value="">Standard layout</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </span>
                  {/* Kan kun slette en gemt skabelon – ikke "Standard layout". */}
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    disabled={!selectedTemplate}
                    aria-label={selectedTemplate ? `Slet skabelonen ${selectedTemplate.name}` : "Slet skabelon"}
                    title={selectedTemplate ? "Slet skabelon" : "Vælg en gemt skabelon for at kunne slette den"}
                    className="p-2 text-stone transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-stone"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {deleteError && <p className="mt-2 text-sm text-red-700">{deleteError}</p>}
            </StepSection>

            <StepSection number="03" title="Visningsregler & Produkter" label="Dendrologisk Udtræk">
              <div className="grid grid-cols-1 gap-8 border-b border-hairline pb-8 md:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-sm border border-hairline p-4">
                  <span className="flex flex-col pr-2">
                    <span className="text-sm font-medium text-forest">Kun produkter med billeder</span>
                    <span className="text-xs text-stone">Udelukker produkter uden billede</span>
                  </span>
                  <Toggle checked={topicOnlyWithImage} onChange={setTopicOnlyWithImage} label="Kun produkter med billeder" />
                </label>
                <div className="flex items-center justify-between gap-2 rounded-sm border border-hairline p-4">
                  <span className="flex flex-col">
                    <label htmlFor="topic-max-results" className="text-sm font-medium text-forest">
                      Maks. antal produkter
                    </label>
                    <span className="text-xs text-stone">Vises i nyhedsbrevet</span>
                  </span>
                  <input
                    id="topic-max-results"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={topicMaxResults}
                    onChange={(event) => setTopicMaxResults(event.target.value)}
                    placeholder="1"
                    className="h-10 w-20 rounded-xs border border-hairline bg-white text-center text-lg font-medium text-forest transition-colors focus:border-forest focus:outline-none"
                  />
                </div>
              </div>

              <div aria-live="polite" className="mt-8 rounded-sm border border-hairline bg-white p-4">
                <p className="mt-1 font-garamond text-2xl leading-[1.35] text-forest">
                  {!showMatchCountNote
                    ? "Beskriv nyhedsbrevet for at søge efter produkter."
                    : topicTotalMatchCount === 0
                      ? "Ingen produkter matcher aktuelle kriterier."
                      : `${topicTotalMatchCount} produkter matcher aktuelle kriterier.`}
                </p>
                {showMatchCountNote && topicTotalMatchCount !== 0 && (
                  <p className="mt-1 text-sm text-stone">
                    Vises i nyhedsbrevet: <strong className="font-medium text-forest">De første {visibleCount}</strong>
                  </p>
                )}
              </div>
            </StepSection>

            <StepSection number="04" title="Beskriv dit nyhedsbrev" label="AI Prompt & Tonalitet">
              <label htmlFor="ai-prompt-input" className="sr-only">
                Beskriv dit nyhedsbrev
              </label>
              <textarea
                id="ai-prompt-input"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="F.eks. 'Lav et nyhedsbrev i en professionel tone til vores erhvervskunder om vores blommetræer'"
                rows={5}
                className="w-full resize-y rounded-sm border border-hairline bg-white p-4 leading-relaxed text-forest transition-all placeholder:text-stone/60 focus:border-forest focus:outline-none"
              />
              <div className="mt-1 flex items-center justify-between gap-4 px-1 text-sm text-stone">
                <span>Teksten bruges både som søgning og som AI-instruks</span>
                <span className="shrink-0">{instructions.length} anslag</span>
              </div>

              {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

              <div className="mt-12 flex flex-col items-stretch justify-between gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleBlankTemplate}
                  disabled={isGenerating}
                  title="Start med et tomt nyhedsbrev og byg det selv fra bunden – uden AI og uden produktdata"
                  className="flex items-center justify-center rounded-xs border border-forest bg-transparent px-8 py-3 text-sm font-medium text-forest transition-all hover:border-plant-hover hover:bg-plant-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-forest disabled:hover:bg-transparent disabled:hover:text-forest"
                >
                  BLANK SKABELON
                </button>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="flex items-center justify-center gap-2 rounded-xs bg-forest px-12 py-3 text-sm font-medium tracking-wider text-white transition-all hover:bg-plant-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-forest"
                  >
                    {isGenerating && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                    {isGenerating ? "GENERERER..." : "GENERÉR NYHEDSBREV"}
                  </button>
                  {!canGenerate && (
                    <p className="text-xs text-stone">Beskriv dit nyhedsbrev ovenfor, før du kan generere det.</p>
                  )}
                </div>
              </div>
            </StepSection>
          </div>

          {/* Højre: planteform-filter */}
          <aside className="flex flex-col gap-8 lg:col-span-5 xl:col-span-4">
            <div className="rounded-sm border border-hairline p-5 sm:p-8">
              <div className="mb-4 flex items-center justify-between border-b border-hairline pb-2">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-5 w-5 text-forest" />
                  <h3 className="text-lg leading-[1.4] font-medium text-forest">Planteform</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTopicPlantForm("")}
                  className="text-sm text-stone underline decoration-hairline hover:text-forest"
                >
                  Nulstil
                </button>
              </div>
              <span className="mb-1 block text-xs font-semibold tracking-[0.12em] text-stone uppercase">
                Form &amp; Vækstkarakter
              </span>
              {/* Én planteform ad gangen (samme filter som hidtil). */}
              <div role="radiogroup" aria-label="Planteform" className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                {[{ value: "", label: "Alle planteformer" }, ...plantForms.map((form) => ({ value: form, label: form }))].map(
                  (option) => {
                    const checked = topicPlantForm === option.value;
                    return (
                      <label key={option.value || "alle"} className="group flex cursor-pointer items-center gap-2 p-1">
                        <input
                          type="radio"
                          name="plant-form"
                          checked={checked}
                          onChange={() => setTopicPlantForm(option.value)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-forest"
                        />
                        <span
                          className={`text-sm ${
                            checked ? "font-medium text-forest" : "text-stone-dark group-hover:text-forest"
                          }`}
                        >
                          {option.label}
                        </span>
                      </label>
                    );
                  },
                )}
              </div>
            </div>
          </aside>
        </div>
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
    </EditorialShell>
  );
}
