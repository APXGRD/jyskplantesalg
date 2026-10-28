"use client";

import { useState, type FormEvent } from "react";
import {
  dialogCancelButtonClassName,
  dialogDescriptionClassName,
  dialogErrorClassName,
  dialogFieldClassName,
  dialogLabelClassName,
  dialogOverlayClassName,
  dialogPanelClassName,
  dialogPrimaryButtonClassName,
  dialogTitleClassName,
} from "@/components/dialogStyles";

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
      <button type="button" aria-label="Luk" onClick={onClose} className={dialogOverlayClassName} />

      <div className={dialogPanelClassName}>
        <h2 className={dialogTitleClassName}>Gem som skabelon</h2>
        <p className={dialogDescriptionClassName}>
          Gemmer kun blokkenes opbygning og styling – ikke den konkrete AI-tekst eller de valgte produkter.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-5">
          <label className="flex flex-col gap-1.5">
            <span className={dialogLabelClassName}>Navn</span>
            <input
              required
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="F.eks. 'Grøn kampagne med galleri'"
              className={dialogFieldClassName}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={dialogLabelClassName}>Beskrivelse (valgfri)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={`${dialogFieldClassName} resize-none`}
            />
          </label>

          {error && <p className={dialogErrorClassName}>{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={dialogCancelButtonClassName}
            >
              Annullér
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className={dialogPrimaryButtonClassName}
            >
              {isSaving ? "Gemmer..." : "Gem skabelon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
