"use client";

import {
  dialogCancelButtonClassName,
  dialogDangerButtonClassName,
  dialogDescriptionClassName,
  dialogOverlayClassName,
  dialogPanelClassName,
  dialogTitleClassName,
} from "@/components/dialogStyles";

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
      <button type="button" aria-label="Luk" onClick={onCancel} className={dialogOverlayClassName} />

      <div className={`${dialogPanelClassName} max-w-sm`}>
        <h2 className={dialogTitleClassName}>{title}</h2>
        <p className={dialogDescriptionClassName}>{description}</p>

        <div className="flex items-center gap-2 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className={dialogCancelButtonClassName}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={dialogDangerButtonClassName}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
