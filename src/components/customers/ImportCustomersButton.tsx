"use client";

import { useRef, type ChangeEvent } from "react";
import { UploadIcon } from "@/components/icons";

export interface ImportedFile {
  name: string;
}

interface ImportCustomersButtonProps {
  onImport: (file: ImportedFile) => void;
}

// Kun UI indtil videre – vælger man en CSV-fil, registreres dens navn, men
// indholdet parses ikke rigtigt endnu (se KunderPage, der viser en
// "X kunder importeret"-bekræftelse ud fra filen).
export function ImportCustomersButton({ onImport }: ImportCustomersButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onImport({ name: file.name });
    }
    event.target.value = "";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-semibold text-ink-muted hover:bg-surface-active hover:text-ink"
      >
        <UploadIcon className="h-3.5 w-3.5" />
        Importér CSV-fil
      </button>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleChange} className="sr-only" />
    </>
  );
}
