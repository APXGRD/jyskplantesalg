// "Kun med billede"-kontakten – DELT mellem "Vælg produkter"-sidens
// filterlinje (ProductFilterBar.tsx) og Opsætnings-sidens Emne-felt
// (OpsaetningClient.tsx), så begge bruger PRÆCIS samme komponent/stil.

interface OnlyWithImageCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function OnlyWithImageCheckbox({ checked, onChange }: OnlyWithImageCheckboxProps) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] text-ink-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 rounded-sm border-zinc-400 accent-ink"
      />
      Kun med billede
    </label>
  );
}
