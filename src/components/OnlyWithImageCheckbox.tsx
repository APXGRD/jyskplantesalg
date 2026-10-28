// "Kun med billede"-kontakten – DELT mellem "Vælg produkter"-sidens
// filterlinje (ProductFilterBar.tsx) og Opsætnings-sidens Emne-felt
// (OpsaetningClient.tsx), så begge bruger PRÆCIS samme komponent/stil.

interface OnlyWithImageCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function OnlyWithImageCheckbox({ checked, onChange }: OnlyWithImageCheckboxProps) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xs border-[0.5px] border-forest bg-white px-3.5 text-sm text-ink-deep">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-forest"
      />
      Kun med billede
    </label>
  );
}
