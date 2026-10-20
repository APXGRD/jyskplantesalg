"use client";

// Selve afmeldings-formularen på den offentlige /afmeld-side (se page.tsx).
// Kalder den offentlige, login-fri API-route api/customers/unsubscribe-by-email.

import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
} from "@/components/AuthShell";
import { CheckIcon, SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "done";

export function AfmeldForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    try {
      const response = await fetch("/api/customers/unsubscribe-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Der skete en fejl. Prøv igen.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Der skete en fejl. Prøv igen.");
    }
  }

  if (status === "done") {
    return (
      <p className="flex items-start gap-2 rounded-sm bg-mint px-4 py-3 text-sm leading-relaxed text-forest">
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
        Hvis denne email er tilmeldt, er den nu afmeldt.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className={authLabelClassName}>Email</span>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Din email-adresse"
          className={authFieldClassName}
        />
      </label>

      {error && <p className={authErrorClassName}>{error}</p>}

      <div className="mt-2 border-t border-hairline pt-6">
        <button type="submit" disabled={status === "submitting"} className={authButtonClassName}>
          {status === "submitting" && <SpinnerIcon className="h-[18px] w-[18px] animate-spin" />}
          {status === "submitting" ? "Afmelder..." : "Bekræft afmelding"}
        </button>
      </div>
    </form>
  );
}
