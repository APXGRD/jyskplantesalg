"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";
import { CheckIcon, ChevronDownIcon, PlusIcon, SpinnerIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { ErrorCard, LoadingCard } from "@/components/FetchStateCard";
import { FONT_FAMILIES } from "@/lib/fontFamilies";
import { useRefreshBrandSettings } from "@/context/BrandSettingsContext";

interface BrandSettingsForm {
  company_name: string;
  brand_colors: string[];
  brand_tone: string;
  primary_font: string;
  logo_data: string | null;
}

const MIN_BRAND_COLORS = 2;
const MAX_BRAND_COLORS = 5;
// Ny farve tilføjet via "+ Tilføj farve" – bevidst neutral/tydeligt en
// pladsholder, som brugeren forventes at ændre med det samme via
// farve-vælgeren.
const NEW_COLOR_PLACEHOLDER = "#000000";

// .svg tillades bevidst ikke – en SVG kan indeholde script og er derfor en
// reel sikkerhedsrisiko at gemme og senere rendere direkte i browseren
// (samme beslutning som allerede gælder for det statiske app-logo).
const LOGO_FILE_ACCEPT = ".png,.jpg,.jpeg";
const MAX_LOGO_FILE_BYTES = 500 * 1024;

const fieldClassName =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-[13px] text-ink placeholder:text-ink-faintest focus:outline-none";

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
        if (!cancelled) {
          setForm({
            company_name: data.company_name,
            brand_colors: Array.isArray(data.brand_colors) ? data.brand_colors : [],
            brand_tone: data.brand_tone,
            primary_font: data.primary_font,
            logo_data: typeof data.logo_data === "string" ? data.logo_data : null,
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

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="brand-settings" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader
          title="Indstillinger"
          subtitle="Firmanavn, brandfarver og tone-of-voice – bruges overalt i appen og i genererede nyhedsbreve"
        />

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <LoadingCard message="Henter indstillinger..." />
          ) : loadError ? (
            <ErrorCard title="Kunne ikke hente indstillingerne" message={loadError} onRetry={retryLoad} />
          ) : form ? (
            <div className="flex max-w-xl flex-col gap-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-ink uppercase">Firmanavn</span>
                <input
                  value={form.company_name}
                  onChange={(event) => updateField("company_name", event.target.value)}
                  className={fieldClassName}
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-wide text-ink uppercase">Logo</span>
                <p className="pb-1 text-xs text-ink-faint">
                  PNG eller JPEG, maks. 500 KB – vises i nyhedsbrevets header (ikke i selve appens sidemenu)
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
                    {form.logo_data ? (
                      // eslint-disable-next-line @next/next/no-img-element -- lokal base64 data-URI, next/image kan ikke optimere den
                      <img src={form.logo_data} alt="Uploadet logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-ink-faintest">Intet logo</span>
                    )}
                  </div>
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active hover:text-ink">
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
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-ink-faintest hover:bg-surface-active hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {logoError && <p className="text-[12px] text-red-600">{logoError}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-wide text-ink uppercase">Brandfarver</span>
                <p className="pb-1 text-xs text-ink-faint">
                  {MIN_BRAND_COLORS}-{MAX_BRAND_COLORS} farver – bruges som farve-swatches i nyhedsbrevets
                  Edit-mode, og de to første som appens egen primær-/sekundærfarve
                </p>

                <div className="flex flex-col gap-2">
                  {form.brand_colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(event) => updateColorAt(index, event.target.value)}
                        className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-white p-1"
                      />
                      <input
                        value={color}
                        onChange={(event) => updateColorAt(index, event.target.value)}
                        className={`${fieldClassName} font-mono`}
                      />
                      <button
                        type="button"
                        onClick={() => removeColorAt(index)}
                        disabled={form.brand_colors.length <= MIN_BRAND_COLORS}
                        aria-label={`Slet farve ${index + 1}`}
                        title="Slet farve"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-ink-faintest hover:bg-surface-active hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-faintest"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addColor}
                  disabled={form.brand_colors.length >= MAX_BRAND_COLORS}
                  className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-[13px] font-medium text-ink-muted hover:border-ink-faintest hover:bg-surface-active hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Tilføj farve
                </button>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-ink uppercase">Skrifttype</span>
                <p className="pb-1 text-xs text-ink-faint">
                  Forvalgt skrifttype for nye nyhedsbreve – kan altid ændres pr. nyhedsbrev i Edit-mode
                </p>
                <div className="relative">
                  <select
                    value={form.primary_font}
                    onChange={(event) => updateField("primary_font", event.target.value)}
                    className={`${fieldClassName} appearance-none pr-8`}
                  >
                    {FONT_FAMILIES.map((font) => (
                      <option key={font.label} value={font.label}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-3 w-3 -translate-y-1/2 text-ink-muted" />
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-ink uppercase">Tone-of-voice</span>
                <p className="pb-1 text-xs text-ink-faint">Bruges i AI-prompten, når nyhedsbreve genereres</p>
                <textarea
                  value={form.brand_tone}
                  onChange={(event) => updateField("brand_tone", event.target.value)}
                  rows={4}
                  className={`${fieldClassName} resize-none`}
                />
              </label>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              <div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : justSaved ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : null}
                  {isSaving ? "Gemmer..." : justSaved ? "Gemt!" : "Gem"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
