"use client";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Bekræft",
  cancelLabel = "Annullér",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
      <button type="button" aria-label="Luk" onClick={onCancel} className="absolute inset-0 bg-black/30" />

      <div className="relative w-full max-w-sm rounded-xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="pt-2 text-[13px] text-ink-muted">{description}</p>

        <div className="flex items-center gap-2 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
