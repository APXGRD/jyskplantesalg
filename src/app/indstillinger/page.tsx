"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { EditorialShell } from "@/components/EditorialShell";
import { CheckIcon, ChevronDownIcon, PlusIcon, SpinnerIcon, TrashIcon, UploadIcon, XIcon } from "@/components/icons";
import { FONT_FAMILIES } from "@/lib/fontFamilies";
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

// Stitch-designet: hvide felter med hårfin kant, skovgrøn ved fokus.
const fieldClassName =
  "h-11 w-full rounded-sm border border-field bg-white px-4 text-sm text-[#1a1a1a] placeholder:text-stone transition-colors focus:border-forest focus:outline-none";
const subLabelClassName = "mb-1 block text-[11px] text-stone uppercase";

// De to første farver bruges som appens primær-/sekundærfarve – resten er
// blot ekstra swatches.
function colorRole(index: number): string {
  if (index === 0) return "Primær";
  if (index === 1) return "Sekundær";
  return `Farve ${index + 1}`;
}

// Nummereret sektion: grå nummer i EB Garamond + versal-etiket.
function FieldBlock({
  number,
  label,
  htmlFor,
  aside,
  children,
}: {
  number: string;
  label: ReactNode;
  htmlFor?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-garamond text-2xl leading-[1.35] font-medium text-stone select-none">{number}</span>
          <label htmlFor={htmlFor} className="text-xs font-semibold tracking-wider text-[#1a1a1a] uppercase">
            {label}
          </label>
        </div>
        {aside}
      </div>
      {children}
    </section>
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

  return (
    <EditorialShell active="brand-settings" previewName={form?.company_name}>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 md:px-12">
        <div className="mx-auto w-full max-w-[760px] py-12">
          {/* Titel */}
          <header className="mb-12">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-forest" />
              <p className="text-xs font-semibold tracking-[0.2em] text-stone uppercase">Trin 04 / Firmakonfiguration</p>
            </div>
            <h1 className="font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-[#1a1a1a] md:text-4xl md:leading-[1.25]">
              Indstillinger
            </h1>
            <div className="mt-4 h-px w-full bg-hairline" />
          </header>

          {isLoading ? (
            <p className="text-sm text-stone">Henter indstillinger...</p>
          ) : loadError ? (
            <div className="flex max-w-md flex-col gap-3 rounded-sm border border-hairline bg-white p-6">
              <h2 className="font-garamond text-2xl leading-[1.35] font-medium text-forest">
                Kunne ikke hente indstillingerne
              </h2>
              <p className="text-sm text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={retryLoad}
                className="w-fit rounded-sm border border-forest px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white"
              >
                Prøv igen
              </button>
            </div>
          ) : form ? (
            <div className="space-y-12">
              <FieldBlock
                number="01"
                htmlFor="company_name"
                label={
                  <>
                    Firmanavn <span className="align-middle text-red-700">*</span>
                  </>
                }
                aside={
                  <span className="text-[10px] font-semibold tracking-[0.12em] text-stone">
                    Påkrævet
                  </span>
                }
              >
                <input
                  id="company_name"
                  value={form.company_name}
                  onChange={(event) => updateField("company_name", event.target.value)}
                  placeholder="F.eks. Jysk Plantesalg ApS"
                  className={`${fieldClassName} h-12 text-base`}
                />
              </FieldBlock>

              <FieldBlock
                number="02"
                label={
                  <>
                    Firmaoplysninger <span className="font-normal text-stone normal-case">(vises i footer)</span>
                  </>
                }
              >
                {/* Alle felter er valgfrie – et tomt felt udelades bare pænt fra
                    nyhedsbrevets footer-linje i stedet for at vise et tomt hul. */}
                <div className="space-y-2 rounded-sm border border-hairline bg-white p-4">
                  <label className="block">
                    <span className={subLabelClassName}>Gade &amp; husnummer</span>
                    <input
                      value={form.street_address}
                      onChange={(event) => updateField("street_address", event.target.value)}
                      placeholder="F.eks. Skovvej 14"
                      className={fieldClassName}
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="block">
                      <span className={subLabelClassName}>Postnummer</span>
                      <input
                        value={form.postal_code}
                        onChange={(event) => updateField("postal_code", event.target.value)}
                        placeholder="F.eks. 8000"
                        className={fieldClassName}
                      />
                    </label>
                    <label className="block sm:col-span-2">
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
                      className={fieldClassName}
                    />
                  </label>
                </div>
              </FieldBlock>

              <FieldBlock number="03" label="Logo">
                <div className="flex flex-col items-center justify-between gap-4 rounded-sm border border-hairline bg-white p-4 sm:flex-row">
                  <div className="flex w-full items-center gap-4 sm:w-auto">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-hairline bg-cream p-2 text-center">
                      {form.logo_data ? (
                        // eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI, next/image kan ikke optimere den
                        <img src={form.logo_data} alt="Uploadet logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] tracking-widest text-stone uppercase">Intet logo</span>
                      )}
                    </div>
                    <div>
                      <div className={`font-garamond text-base ${form.company_name.trim() ? "text-[#1a1a1a]" : "text-stone"}`}>
                        {form.company_name.trim() || "Firmanavn"}
                      </div>
                      <p className="text-xs text-stone">
                        PNG eller JPEG, maks. 500 KB – vises i nyhedsbrevets header og i appens topbar
                      </p>
                      <div className="mt-1 inline-flex items-center gap-1.5">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${form.logo_data ? "bg-forest" : "bg-hairline"}`} />
                        <span className="text-[10px] text-stone uppercase">
                          {form.logo_data ? "Aktivt bomærke" : "Intet logo uploadet"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-1 sm:w-auto">
                    <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-forest px-4 text-sm font-medium whitespace-nowrap text-forest transition-colors focus-within:ring-2 focus-within:ring-forest/30 hover:border-plant-hover hover:bg-plant-hover hover:text-white sm:w-auto">
                      <UploadIcon className="h-[18px] w-[18px]" />
                      {form.logo_data ? "Udskift logo" : "Upload logo"}
                      <input type="file" accept={LOGO_FILE_ACCEPT} onChange={handleLogoFileChange} className="sr-only" />
                    </label>
                    {form.logo_data && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        aria-label="Slet logo"
                        title="Slet logo"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-hairline text-stone transition-colors hover:text-red-700"
                      >
                        <TrashIcon className="h-[18px] w-[18px]" />
                      </button>
                    )}
                  </div>
                </div>
                {logoError && <p className="pt-2 text-sm text-red-700">{logoError}</p>}
              </FieldBlock>

              <FieldBlock
                number="04"
                label="Brandfarver"
                aside={
                  <span className="text-xs text-stone">
                    {form.brand_colors.filter((color) => HEX_COLOR_PATTERN.test(color)).length} af {MAX_BRAND_COLORS} anvendt
                  </span>
                }
              >
                <div className="space-y-1 rounded-sm border border-hairline bg-white p-2">
                  {form.brand_colors.map((color, index) => {
                    const isValid = HEX_COLOR_PATTERN.test(color);
                    return (
                      <div key={index}>
                        {index > 0 && <div className="mx-2 mb-1 h-px bg-hairline/60" />}
                        <div className="flex items-center justify-between gap-4 rounded-sm p-2 transition-colors hover:bg-plant-bg">
                          <div className="flex min-w-0 items-center gap-4">
                            {/* Farvefeltet: farve-vælgeren ligger usynligt ovenpå, så
                                et klik åbner den. Ingen farve endnu = stiplet boks. */}
                            <span
                              className={`relative inline-block h-8 w-8 shrink-0 rounded-sm shadow-sm ${
                                isValid ? "border border-black/10" : "border border-dashed border-stone/50"
                              }`}
                              style={{ backgroundColor: isValid ? color : undefined }}
                            >
                              <input
                                type="color"
                                value={isValid ? color : "#ffffff"}
                                onChange={(event) => updateColorAt(index, event.target.value)}
                                aria-label={`Vælg farve ${index + 1}`}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              />
                            </span>
                            <span className="text-sm font-medium text-[#1a1a1a]">
                              Farve {index + 1}
                              {index < 2 && (
                                <span
                                  className={`ml-2 rounded-xs px-1.5 py-0.5 text-[10px] uppercase ${
                                    index === 0 ? "bg-mint text-forest" : "bg-track text-stone"
                                  }`}
                                >
                                  {colorRole(index)}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              value={color}
                              onChange={(event) => updateColorAt(index, event.target.value)}
                              aria-label={`Hex-kode for farve ${index + 1}`}
                              placeholder={COLOR_EXAMPLES[index] ?? COLOR_EXAMPLES[0]}
                              className="w-[5.5rem] rounded-xs bg-transparent px-2 py-1 text-right font-mono text-xs text-black uppercase placeholder:text-stone focus:ring-1 focus:ring-forest focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeColorAt(index)}
                              disabled={form.brand_colors.length <= MIN_BRAND_COLORS}
                              aria-label={`Slet farve ${index + 1}`}
                              title={
                                form.brand_colors.length <= MIN_BRAND_COLORS
                                  ? `Mindst ${MIN_BRAND_COLORS} farver kræves`
                                  : "Slet farve"
                              }
                              className="flex items-center justify-center rounded-sm border border-hairline p-1 text-stone transition-colors hover:bg-plant-bg hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone"
                            >
                              <XIcon className="h-[18px] w-[18px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addColor}
                  disabled={form.brand_colors.length >= MAX_BRAND_COLORS}
                  title={`${MIN_BRAND_COLORS}-${MAX_BRAND_COLORS} farver – de to første bruges som appens primær-/sekundærfarve`}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-forest px-3 py-1 text-sm font-medium text-forest transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-forest disabled:hover:bg-transparent disabled:hover:text-forest"
                >
                  <PlusIcon className="h-[18px] w-[18px]" />
                  Tilføj farve
                </button>
              </FieldBlock>

              <FieldBlock number="05" label="Skrifttype" htmlFor="primary_font">
                <div className="relative rounded-sm bg-white">
                  <select
                    id="primary_font"
                    value={form.primary_font}
                    onChange={(event) => updateField("primary_font", event.target.value)}
                    style={{ fontFamily: selectedFont?.value }}
                    className={`h-12 w-full cursor-pointer appearance-none rounded-sm border border-field bg-white pr-10 pl-4 transition-colors focus:border-forest focus:outline-none ${
                      form.primary_font ? "text-[#1a1a1a]" : "text-stone"
                    }`}
                  >
                    <option value="" disabled>
                      Vælg skrifttype – f.eks. Georgia
                    </option>
                    {FONT_FAMILIES.map((font) => (
                      <option key={font.label} value={font.label}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-stone" />
                </div>
                <p className="mt-1 text-xs text-stone">
                  Forvalgt skrifttype for nye nyhedsbreve – kan altid ændres pr. nyhedsbrev i Edit-mode.
                </p>
              </FieldBlock>

              <FieldBlock
                number="06"
                label="Tone of voice (AI-instruks)"
                htmlFor="brand_tone"
                aside={<span className="font-mono text-xs text-stone">{form.brand_tone.length} anslag</span>}
              >
                <div className="rounded-sm border border-hairline bg-white p-2 transition-colors focus-within:border-forest">
                  <textarea
                    id="brand_tone"
                    value={form.brand_tone}
                    onChange={(event) => updateField("brand_tone", event.target.value)}
                    placeholder="F.eks. varm, venlig og faglig – vi fremhæver kvalitet og giver gode råd om pleje"
                    rows={4}
                    className="w-full resize-none border-0 bg-transparent p-1 leading-relaxed text-[#1a1a1a] placeholder:text-stone focus:ring-0 focus:outline-none"
                  />
                  <div className="mt-2 border-t border-hairline/60 pt-2 text-xs text-stone">
                    Bruges i AI-prompten, når nyhedsbreve genereres.
                  </div>
                </div>
              </FieldBlock>

              <div className="space-y-4 border-t border-hairline pt-8">
                {saveError && <p className="text-sm text-red-700">{saveError}</p>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#36482e] px-8 text-xs font-semibold tracking-widest text-white uppercase shadow-sm transition-colors hover:bg-plant-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSaving ? (
                    <SpinnerIcon className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <CheckIcon className="h-[18px] w-[18px]" />
                  )}
                  {isSaving ? "Gemmer..." : justSaved ? "Gemt!" : "Gem indstillinger"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </EditorialShell>
  );
}
