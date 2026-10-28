"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, SpinnerIcon } from "@/components/icons";
import {
  dialogCancelButtonClassName,
  dialogDescriptionClassName,
  dialogErrorClassName,
  dialogFieldClassName,
  dialogLabelClassName,
  dialogOverlayClassName,
  dialogPanelClassName,
  dialogPrimaryButtonClassName,
  dialogSuccessClassName,
  dialogTitleClassName,
} from "@/components/dialogStyles";

interface SendTestMailDialogProps {
  onClose: () => void;
  // Sender nyhedsbrevet til `to` – kaster ved fejl (vises i dialogen), se
  // preview/page.tsx.
  onSend: (to: string) => Promise<void>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Send test-mail": skriv en mailadresse og send det aktuelle nyhedsbrev dertil
// for at se, hvordan det ser ud i en rigtig indbakke, før det sendes ud til
// kunderne. Feltet forudfyldes med den indloggede brugers egen mail.
export function SendTestMailDialog({ onClose, onSend }: SendTestMailDialogProps) {
  const [to, setTo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Forudfyld med den indloggede brugers mail (kun hvis feltet stadig er tomt).
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const email = data.user?.email;
        if (!cancelled && email) setTo((current) => current || email);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape lukker dialogen (ikke midt i en afsendelse).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSending) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSending, onClose]);

  const isValid = EMAIL_PATTERN.test(to.trim());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || isSending) return;
    setIsSending(true);
    setError(null);
    setSentTo(null);
    try {
      await onSend(to.trim());
      setSentTo(to.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button type="button" aria-label="Luk" onClick={onClose} className={dialogOverlayClassName} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-mail-title"
        className={dialogPanelClassName}
      >
        <h2 id="test-mail-title" className={dialogTitleClassName}>
          Send test-mail
        </h2>
        <p className={dialogDescriptionClassName}>
          Send nyhedsbrevet til dig selv og se, hvordan det ser ud i en rigtig indbakke, før det sendes ud til
          kunderne.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-5">
          <label className="flex flex-col gap-1.5">
            <span className={dialogLabelClassName}>Send til</span>
            <input
              type="email"
              required
              autoFocus
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setSentTo(null);
              }}
              placeholder="F.eks. dig@jyskplantesalg.dk"
              className={dialogFieldClassName}
            />
          </label>

          <div aria-live="polite">
            {error && <p className={dialogErrorClassName}>{error}</p>}
            {sentTo && (
              <p className={dialogSuccessClassName}>
                <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                Test-mailen er sendt til {sentTo}. Tjek indbakken (og evt. spam).
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className={dialogCancelButtonClassName}
            >
              {sentTo ? "Luk" : "Annullér"}
            </button>
            <button
              type="submit"
              disabled={!isValid || isSending}
              className={dialogPrimaryButtonClassName}
            >
              {isSending && <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />}
              {isSending ? "Sender..." : sentTo ? "Send igen" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
