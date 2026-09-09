"use client";

import { useState, type FormEvent } from "react";

interface SaveTemplateDialogProps {
  onClose: () => void;
  // Kaster ved fejl (fanges her og vises i dialogen) – lukker først dialogen
  // ved et faktisk gennemført gem, se preview/page.tsx.
  onSave: (name: string, description: string) => Promise<void>;
}

export function SaveTemplateDialog({ onClose, onSave }: SaveTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedName, description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
      <button type="button" aria-label="Luk" onClick={onClose} className="absolute inset-0 bg-black/30" />

      <div className="relative w-full max-w-sm rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <h2 className="text-[15px] font-semibold text-ink">Gem som skabelon</h2>
        <p className="pt-1 text-[13px] text-ink-muted">
          Gemmer kun blokkenes opbygning og styling – ikke den konkrete AI-tekst eller de valgte produkter.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-muted">Navn</span>
            <input
              required
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="F.eks. 'Grøn kampagne med galleri'"
              className="w-full rounded-lg border border-border px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink-faintest"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-muted">Beskrivelse (valgfri)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink-faintest"
            />
          </label>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annullér
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Gemmer..." : "Gem skabelon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
