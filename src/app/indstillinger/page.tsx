"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { SectionLabel, StitchShell } from "@/components/StitchShell";
import { CheckIcon, ChevronDownIcon, PlusIcon, SpinnerIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { FONT_FAMILIES } from "@/lib/fontFamilies";
import { getContrastTextColor } from "@/lib/brandColors";
import { useRefreshBrandSettings } from "@/context/BrandSettingsContext";

interface BrandSettingsForm {
  company_name: string;
  brand_colors: string[];
  brand_tone: string;
  primary_font: string;
  logo_data: string | null;
  // Firmaoplysninger til nyhedsbrevets footer – ALLE fire er valgfrie tekst-
  // felter (tom streng er en helt gyldig værdi, "ikke udfyldt"), til
  // forskel fra company_name/brand_tone ovenfor. Se formatFooterAddressLine
  // (BrandSettingsContext.tsx) for hvordan et tomt felt håndteres pænt i
  // selve footeren.
  street_address: string;
  postal_code: string;
  city: string;
  business_registration_number: string;
}

const MIN_BRAND_COLORS = 2;
const MAX_BRAND_COLORS = 5;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
// Ny farve tilføjet via "+ Tilføj farve" starter TOM (kun en eksempel-
// placeholder) – ingen hardcodet farve, brugeren vælger selv.
const NEW_COLOR_PLACEHOLDER = "";
// Eksempel-placeholders til hex-felterne pr. plads (ikke gemte værdier).
const COLOR_EXAMPLES = ["#2F5233", "#9CAF88", "#E8EFE7", "#C47A3A", "#1A1A1A"];

// Når der endnu ikke er gemt nogen indstillinger (se configured i
// api/settings), starter formularen helt tom – kun placeholders med eksempler
// – i stedet for at vise appens hardcodede standardværdier (brand.ts), som om
// de var kundens egne. To tomme farvepladser, da mindst 2 farver kræves.
const EMPTY_FORM: BrandSettingsForm = {
  company_name: "",
  brand_colors: ["", ""],
  brand_tone: "",
  primary_font: "",
  logo_data: null,
  street_address: "",
  postal_code: "",
  city: "",
  business_registration_number: "",
};

// .svg tillades bevidst ikke – en SVG kan indeholde script og er derfor en
// reel sikkerhedsrisiko at gemme og senere rendere direkte i browseren
// (samme beslutning som allerede gælder for det statiske app-logo).
const LOGO_FILE_ACCEPT = ".png,.jpg,.jpeg";
const MAX_LOGO_FILE_BYTES = 500 * 1024;

const fieldClassName =
  "w-full rounded-xs border border-[#cfcfcf] bg-[#fdfdfd] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-neutral-400 transition-colors focus:border-black focus:bg-white focus:outline-none";

const subLabelClassName = "mb-1 block font-jetbrains text-[11px] text-[#666666] uppercase";

// De to første farver bruges som appens primær-/sekundærfarve (se
// hjælpeteksten under Brandfarver) – resten er blot ekstra swatches.
function colorRole(index: number): string {
  if (index === 0) return "Primær";
  if (index === 1) return "Sekundær";
  return `Farve ${index + 1}`;
}

function FieldBlock({
  number,
  title,
  meta,
  description,
  children,
}: {
  number: string;
  title: string;
  meta?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>
          {number}. {title}
        </SectionLabel>
        {meta && <span className="font-jetbrains text-[10px] text-[#888888] uppercase">{meta}</span>}
      </div>
      {description && <p className="text-xs text-[#777777]">{description}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

function InspectorCard({ label, tag, children }: { label: string; tag?: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border border-[#e5e5e5] bg-white p-4">
      <div className="flex items-center justify-between gap-2 font-jetbrains text-[10px] text-[#888888] uppercase">
        <span>{label}</span>
        {tag && <span className="font-semibold text-black">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

export default function IndstillingerPage() {
  const refreshBrandSettings = useRefreshBrandSettings();
  const [form, setForm] = useState<BrandSettingsForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [logoError, setLogoError] = useState<string | null>(null);

  // Felterne viser den gemte værdi (eksempel-placeholder kun når intet er
  // gemt). Et felt, der ryddes helt og gemmes, beholder den gemte værdi, da
  // API'et ikke tillader tomt firmanavn/tone.
  const [savedText, setSavedText] = useState({ company_name: "", brand_tone: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "Kunne ikke hente indstillingerne.");
        }
        if (!cancelled && data.configured === false) {
          setSavedText({ company_name: "", brand_tone: "" });
          setForm(EMPTY_FORM);
        } else if (!cancelled) {
          setSavedText({ company_name: data.company_name ?? "", brand_tone: data.brand_tone ?? "" });
          setForm({
            company_name: data.company_name ?? "",
            brand_colors: Array.isArray(data.brand_colors) ? data.brand_colors : [],
            brand_tone: data.brand_tone ?? "",
            primary_font: data.primary_font,
            logo_data: typeof data.logo_data === "string" ? data.logo_data : null,
            // NULL i databasen (aldrig udfyldt endnu) bliver til en tom
            // streng her, så felterne blot starter tomme i formularen, i
            // stedet for at vise "null" som tekst.
            street_address: typeof data.street_address === "string" ? data.street_address : "",
            postal_code: typeof data.postal_code === "string" ? data.postal_code : "",
            city: typeof data.city === "string" ? data.city : "",
            business_registration_number:
              typeof data.business_registration_number === "string" ? data.business_registration_number : "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  function retryLoad() {
    setRetryToken((token) => token + 1);
  }

  function updateField<K extends keyof BrandSettingsForm>(key: K, value: BrandSettingsForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateColorAt(index: number, value: string) {
    setForm((current) => {
      if (!current) return current;
      const brand_colors = current.brand_colors.map((color, i) => (i === index ? value : color));
      return { ...current, brand_colors };
    });
  }

  function addColor() {
    setForm((current) => {
      if (!current || current.brand_colors.length >= MAX_BRAND_COLORS) return current;
      return { ...current, brand_colors: [...current.brand_colors, NEW_COLOR_PLACEHOLDER] };
    });
  }

  function removeColorAt(index: number) {
    setForm((current) => {
      if (!current || current.brand_colors.length <= MIN_BRAND_COLORS) return current;
      return { ...current, brand_colors: current.brand_colors.filter((_, i) => i !== index) };
    });
  }

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Nulstiller altid selve filvælgeren, uanset udfald – ellers ville et
    // andet forsøg på at vælge PRÆCIS samme fil (fx efter en afvist for stor
    // fil) ikke udløse en ny change-event.
    event.target.value = "";
    if (!file) return;

    setLogoError(null);

    if (file.size > MAX_LOGO_FILE_BYTES) {
      setLogoError(`Filen er for stor (${Math.round(file.size / 1024)} KB) – maks. 500 KB.`);
      return;
    }

    // Samme teknik som ImageBlockControls.tsx bruger til billed-upload i
    // Edit-mode: konverter til en base64 data-URI via FileReader, så den kan
    // gemmes direkte i settings-tabellens logo_data-kolonne uden en separat
    // fil-lagringsløsning.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("logo_data", reader.result);
      }
    };
    reader.onerror = () => {
      setLogoError("Kunne ikke læse filen. Prøv igen.");
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoError(null);
    updateField("logo_data", null);
  }

  async function handleSave() {
    if (!form || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    setJustSaved(false);

    const company_name = form.company_name.trim() || savedText.company_name;
    const brand_tone = form.brand_tone.trim() || savedText.brand_tone;

    // Venlig besked om præcis hvad der mangler (fx første gang, hvor alle
    // felter starter tomme), i stedet for API'ets tekniske valideringsfejl.
    const missing: string[] = [];
    if (!company_name) missing.push("firmanavn");
    const filledColors = form.brand_colors.filter((color) => color.trim());
    if (filledColors.length < MIN_BRAND_COLORS) {
      missing.push(`mindst ${MIN_BRAND_COLORS} brandfarver`);
    } else if (form.brand_colors.some((color) => !HEX_COLOR_PATTERN.test(color))) {
      missing.push("gyldige hex-koder for alle farver (fx #2F5233) – eller slet de tomme");
    }
    if (!form.primary_font) missing.push("skrifttype");
    if (!brand_tone) missing.push("tone-of-voice");
    if (missing.length > 0) {
      setSaveError(`Udfyld ${missing.join(", ")} før du gemmer.`);
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, company_name, brand_tone }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Kunne ikke gemme indstillingerne. Prøv igen.");
      }

      // Uden dette forbliver BrandSettingsContext (root-layoutet, genmonteres
      // ikke ved almindelig navigation) på sin gamle snapshot, indtil
      // brugeren genindlæser siden – gemningen ville derfor lykkes uden fejl,
      // men være usynlig alle andre steder i appen (fx nyhedsbrevets header).
      await refreshBrandSettings();

      setSavedText({ company_name, brand_tone });
      setForm((current) => (current ? { ...current, company_name, brand_tone } : current));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsSaving(false);
    }
  }


  const selectedFont = form ? FONT_FAMILIES.find((font) => font.label === form.primary_font) : undefined;
  const locationLine = form ? [form.city.trim(), form.postal_code.trim() && `(${form.postal_code.trim()})`].filter(Boolean).join(" ") : "";

  return (
    <StitchShell active="brand-settings" previewName={form?.company_name}>
      {/* Titel + trinindikator */}
      <section className="border-b border-black/10 bg-white/40 px-4 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="mb-1.5 font-jetbrains text-[10px] tracking-widest text-[#71717A] uppercase">
              Trin 04 <span className="text-black/30">/</span> Firmakonfiguration
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase sm:text-4xl">Indstillinger</h1>
            <p className="mt-1.5 text-sm text-[#555555]">
              Firmanavn, brandfarver og tone-of-voice – bruges overalt i appen og i genererede nyhedsbreve
            </p>
          </div>
          <div className="hidden text-right font-jetbrains sm:block">
            <div className="text-4xl font-bold tracking-tight">
              04<span className="font-light text-[#a0a0a0]">/04</span>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <p className="py-16 text-center font-jetbrains text-xs tracking-wider text-[#71717A] uppercase">
          Henter indstillinger...
        </p>
      ) : loadError ? (
        <div className="p-4 sm:p-8">
          <div className="flex max-w-md flex-col gap-3 border border-red-200 bg-white p-6">
            <SectionLabel>Kunne ikke hente indstillingerne</SectionLabel>
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={retryLoad}
              className="w-fit rounded border border-black/20 bg-white px-4 py-2 font-jetbrains text-xs tracking-wider uppercase hover:border-black"
            >
              Prøv igen
            </button>
          </div>
        </div>
      ) : form ? (
        <main className="grid flex-1 grid-cols-1 divide-y divide-black/10 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          {/* Formular */}
          <section className="space-y-9 bg-white p-4 sm:p-10 lg:col-span-8">
            <FieldBlock number="01" title="Firmanavn" meta="Påkrævet">
              <input
                id="company_name"
                aria-label="Firmanavn"
                value={form.company_name}
                onChange={(event) => updateField("company_name", event.target.value)}
                placeholder="F.eks. Jysk Plantesalg ApS"
                className={`${fieldClassName} font-medium`}
              />
            </FieldBlock>

            <FieldBlock
              number="02"
              title="Firmaoplysninger (vises i footer)"
              description="Alle felter er valgfrie – et tomt felt udelades bare pænt fra nyhedsbrevets footer-linje i stedet for at vise et tomt hul."
            >
              <div className="space-y-3">
                <label className="block">
                  <span className={subLabelClassName}>Adresse</span>
                  <input
                    value={form.street_address}
                    onChange={(event) => updateField("street_address", event.target.value)}
                    placeholder="F.eks. Skovvej 14"
                    className={fieldClassName}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <label className="block sm:col-span-4">
                    <span className={subLabelClassName}>Postnr.</span>
                    <input
                      value={form.postal_code}
                      onChange={(event) => updateField("postal_code", event.target.value)}
                      placeholder="F.eks. 8000"
                      className={`${fieldClassName} font-jetbrains`}
                    />
                  </label>
                  <label className="block sm:col-span-8">
                    <span className={subLabelClassName}>By</span>
                    <input
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      placeholder="F.eks. Aarhus C"
                      className={fieldClassName}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={subLabelClassName}>CVR-nummer</span>
                  <input
                    value={form.business_registration_number}
                    onChange={(event) => updateField("business_registration_number", event.target.value)}
                    placeholder="F.eks. 12 34 56 78"
                    className={`${fieldClassName} font-jetbrains`}
                  />
                </label>
              </div>
            </FieldBlock>

            <FieldBlock
              number="03"
              title="Logo"
              description="PNG eller JPEG, maks. 500 KB – vises i nyhedsbrevets header og i appens topbar"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden border border-dashed border-[#c0c0c0] bg-[#fafafa]">
                  {form.logo_data ? (
                    // eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI, next/image kan ikke optimere den
                    <img src={form.logo_data} alt="Uploadet logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="font-jetbrains text-xs text-[#888888]">Intet logo</span>
                  )}
                </div>
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 border border-[#333333] bg-white px-4 py-2.5 font-jetbrains text-xs font-medium tracking-tight uppercase transition-colors duration-150 hover:bg-black hover:text-white">
                  <UploadIcon className="h-3.5 w-3.5" />
                  {form.logo_data ? "Udskift logo" : "Upload logo"}
                  <input type="file" accept={LOGO_FILE_ACCEPT} onChange={handleLogoFileChange} className="sr-only" />
                </label>
                {form.logo_data && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    aria-label="Slet logo"
                    title="Slet logo"
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#cfcfcf] bg-white text-[#888888] transition-colors hover:border-red-700 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {logoError && <p className="pt-2 text-[12px] text-red-600">{logoError}</p>}
            </FieldBlock>

            <FieldBlock
              number="04"
              title="Brandfarver"
              meta={`${form.brand_colors.filter((color) => HEX_COLOR_PATTERN.test(color)).length}/${MAX_BRAND_COLORS} valgt`}
              description={`${MIN_BRAND_COLORS}-${MAX_BRAND_COLORS} farver – bruges som farve-swatches i nyhedsbrevets Edit-mode, og de to første som appens egen primær-/sekundærfarve`}
            >
              <div className="max-w-xl space-y-2">
                {form.brand_colors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center border border-[#cfcfcf] bg-white p-1.5 focus-within:border-black">
                      {/* En tom farve (intet valgt endnu) vises som en stiplet
                          boks – farve-vælgeren ligger usynligt ovenpå, så et
                          klik stadig åbner den. */}
                      <span className="relative h-8 w-8 shrink-0">
                        {!HEX_COLOR_PATTERN.test(color) && (
                          <span className="pointer-events-none absolute inset-0 border border-dashed border-[#bbbbbb] bg-[#fafafa]" />
                        )}
                        <input
                          type="color"
                          value={HEX_COLOR_PATTERN.test(color) ? color : "#ffffff"}
                          onChange={(event) => updateColorAt(index, event.target.value)}
                          aria-label={`Vælg farve ${index + 1}`}
                          className={`h-8 w-8 cursor-pointer border border-black/10 bg-transparent p-0 ${
                            HEX_COLOR_PATTERN.test(color) ? "" : "opacity-0"
                          }`}
                        />
                      </span>
                      <input
                        value={color}
                        onChange={(event) => updateColorAt(index, event.target.value)}
                        aria-label={`Hex-kode for farve ${index + 1}`}
                        placeholder={`F.eks. ${COLOR_EXAMPLES[index] ?? COLOR_EXAMPLES[0]}`}
                        className="w-full min-w-0 border-0 bg-transparent px-3 py-1 font-jetbrains text-xs text-[#222222] uppercase placeholder:normal-case placeholder:text-neutral-400 focus:outline-none"
                      />
                      <span className="mr-2 shrink-0 font-jetbrains text-[10px] text-[#999999] uppercase">
                        {colorRole(index)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColorAt(index)}
                      disabled={form.brand_colors.length <= MIN_BRAND_COLORS}
                      aria-label={`Slet farve ${index + 1}`}
                      title="Slet farve"
                      className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#cfcfcf] bg-white text-[#888888] transition-colors hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#cfcfcf] disabled:hover:text-[#888888]"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addColor}
                  disabled={form.brand_colors.length >= MAX_BRAND_COLORS}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 border border-dashed border-[#bbbbbb] py-2 font-jetbrains text-xs font-medium text-[#555555] transition-colors hover:border-black hover:bg-neutral-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#bbbbbb] disabled:hover:bg-transparent disabled:hover:text-[#555555]"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Tilføj farve
                </button>
              </div>
            </FieldBlock>

            <FieldBlock
              number="05"
              title="Skrifttype"
              description="Forvalgt skrifttype for nye nyhedsbreve – kan altid ændres pr. nyhedsbrev i Edit-mode"
            >
              <div className="relative max-w-xl">
                <select
                  value={form.primary_font}
                  onChange={(event) => updateField("primary_font", event.target.value)}
                  aria-label="Skrifttype"
                  style={{ fontFamily: selectedFont?.value }}
                  className={`${fieldClassName} cursor-pointer appearance-none bg-white pr-10 ${
                    form.primary_font ? "" : "text-neutral-400"
                  }`}
                >
                  <option value="" disabled>
                    Vælg skrifttype – f.eks. Georgia
                  </option>
                  {FONT_FAMILIES.map((font) => (
                    <option key={font.label} value={font.label} className="text-[#111111]">
                      {font.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
              </div>
            </FieldBlock>

            <FieldBlock
              number="06"
              title="Tone-of-voice"
              meta="Sproglig retningslinje"
              description="Bruges i AI-prompten, når nyhedsbreve genereres"
            >
              <textarea
                value={form.brand_tone}
                onChange={(event) => updateField("brand_tone", event.target.value)}
                aria-label="Tone-of-voice"
                placeholder="F.eks. Varm, venlig og faglig – vi fremhæver kvalitet og giver gode råd om pleje"
                rows={3}
                className={`${fieldClassName} resize-y p-3.5`}
              />
              <div className="flex justify-end pt-1 font-jetbrains text-[10px] text-[#888888]">
                <span>{form.brand_tone.length} anslag</span>
              </div>
            </FieldBlock>

            <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-6">
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex w-fit items-center gap-2 bg-black px-7 py-3 font-jetbrains text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all duration-150 hover:bg-[#222222] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {isSaving ? (
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                ) : justSaved ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : null}
                {isSaving ? "Gemmer..." : justSaved ? "Gemt!" : "Gem indstillinger"}
              </button>
            </div>
          </section>

          {/* Inspektør: live-overblik over de aktuelle værdier i formularen */}
          <aside className="space-y-6 bg-[#fbfbfb] p-4 sm:p-8 lg:col-span-4">
            <div className="border-b border-[#e5e5e5] pb-3">
              <SectionLabel>Inspektør</SectionLabel>
            </div>

            <InspectorCard label="01. Brand-identitet">
              <div className={`text-sm font-bold tracking-tight ${form.company_name.trim() ? "" : "text-black/30"}`}>
                {form.company_name.trim() || "Logo"}
              </div>
              <div className="font-jetbrains text-[11px] leading-relaxed text-[#666666]">
                CVR: {form.business_registration_number.trim() || "–"}
                <br />
                Lokation: {locationLine || "–"}
              </div>
            </InspectorCard>

            <InspectorCard
              label="02. Farvepalet"
              tag={`${form.brand_colors.filter((color) => HEX_COLOR_PATTERN.test(color)).length} farver`}
            >
              <div className="flex items-center gap-1.5 pt-1">
                {form.brand_colors.map((color, index) =>
                  HEX_COLOR_PATTERN.test(color) ? (
                    <div
                      key={index}
                      title={color}
                      className="flex h-9 flex-1 items-end border border-black/10 p-1"
                      style={{ backgroundColor: color }}
                    >
                      <span className="font-jetbrains text-[8px] uppercase" style={{ color: getContrastTextColor(color) }}>
                        {color.slice(0, 3)}
                      </span>
                    </div>
                  ) : (
                    <div key={index} title="Ikke valgt" className="h-9 flex-1 border border-dashed border-[#c0c0c0] bg-[#fafafa]" />
                  ),
                )}
              </div>
              <div className="font-jetbrains text-[10px] text-[#777777]">Primær / Sekundær = de to første</div>
            </InspectorCard>

            <InspectorCard label="03. Skrifttype">
              <div
                className={`text-base ${form.primary_font ? "text-[#222222]" : "text-black/30"}`}
                style={{ fontFamily: selectedFont?.value }}
              >
                {form.primary_font || "Ingen skrifttype valgt"}
              </div>
              <div className="font-jetbrains text-[11px] text-[#666666]">
                Forvalgt for nye nyhedsbreve – vist her i sin egen skrift.
              </div>
            </InspectorCard>

            <InspectorCard label="04. Tone-of-voice">
              <div className="border-l-2 border-black bg-[#f5f5f5] p-2.5 font-jetbrains text-xs text-[#333333]">
                {form.brand_tone.trim() ? `"${form.brand_tone.trim()}"` : "Ingen tone angivet"}
              </div>
            </InspectorCard>
          </aside>
        </main>
      ) : null}
    </StitchShell>
  );
}
