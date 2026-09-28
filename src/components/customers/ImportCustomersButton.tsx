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
        className="inline-flex items-center gap-1.5 border border-[#cfcfcf] bg-white px-3 py-1.5 font-jetbrains text-xs font-medium text-black uppercase shadow-sm transition hover:border-black"
      >
        <UploadIcon className="h-3.5 w-3.5" />
        Importér CSV
      </button>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleChange} className="sr-only" />
    </>
  );
}
