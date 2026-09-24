"use client";
// src/app/afmeld/page.tsx
//
// Den OFFENTLIGE, generiske afmeldingsside – FAST link i footeren på ALLE
// nyhedsbreve (samme URL uanset modtager, se getUnsubscribeUrl), da
// "Kopiér nyhedsbrev"-arbejdsgangen ikke sender individuelle emails med et
// personligt afmeldings-token pr. modtager. Brugeren indtaster derfor selv
// sin email – ingen forudfyldt data. Bevidst UNDTAGET fra middleware'ens
// login-krav (se isPublicAuthRoute i src/lib/supabase/middleware.ts) og
// kalder en TILSVARENDE offentlig, login-fri API-route
// (api/customers/unsubscribe-by-email), da en rigtig nyhedsbrevsmodtager
// aldrig er logget ind i selve appen.

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { brand } from "@/config/brand";

type Status = "idle" | "submitting" | "done";

export default function AfmeldPage() {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
          <Logo className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center leading-tight">
          <h1 className="text-2xl font-semibold tracking-wide text-ink uppercase">{brand.name}</h1>
          <p className="text-sm text-ink-muted">Afmeld nyhedsbrevet</p>
        </div>
      </div>

      {status === "done" ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-ink">Hvis denne email er tilmeldt, er den nu afmeldt.</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-ink-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "submitting" ? "Afmelder..." : "Bekræft afmelding"}
          </button>
        </form>
      )}
    </div>
  );
}
