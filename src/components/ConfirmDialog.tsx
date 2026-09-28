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

      <div className="relative w-full max-w-sm rounded-xs border border-black bg-white p-5 font-grotesk shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        <h2 className="flex items-center gap-2 font-jetbrains text-xs font-bold tracking-widest text-black uppercase">
          <span className="h-1.5 w-1.5 bg-black" />
          {title}
        </h2>
        <p className="pt-3 text-sm leading-relaxed text-[#555555]">{description}</p>

        <div className="flex items-center gap-2 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded border border-neutral-300 bg-white font-jetbrains text-xs tracking-wider text-neutral-800 uppercase shadow-xs transition-colors hover:border-black hover:bg-neutral-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded bg-red-600 px-4 py-2.5 font-jetbrains text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
