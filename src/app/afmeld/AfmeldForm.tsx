"use client";

// Selve afmeldings-formularen på den offentlige /afmeld-side (se page.tsx).
// Kalder den offentlige, login-fri API-route api/customers/unsubscribe-by-email.

import { useState } from "react";

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
      <p className="mt-7 border-l-2 border-black bg-[#f5f5f5] px-3 py-3 font-jetbrains text-xs leading-relaxed text-black">
        Hvis denne email er tilmeldt, er den nu afmeldt.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-jetbrains text-[11px] text-[#666666] uppercase">
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
          placeholder="Din email-adresse"
          className="w-full rounded-xs border border-[#cfcfcf] bg-[#fdfdfd] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-neutral-400 transition-colors focus:border-black focus:bg-white focus:outline-none"
        />
      </div>

      {error && (
        <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 font-jetbrains text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-1 w-full bg-black px-7 py-3 font-jetbrains text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-[#222222] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {status === "submitting" ? "Afmelder..." : "Bekræft afmelding"}
      </button>
    </form>
  );
}
