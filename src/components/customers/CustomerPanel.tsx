"use client";

import { useState, type FormEvent } from "react";
import type { CustomerType } from "@/lib/format";
import type { ShopifyCustomer } from "@/lib/customers";
import { ChevronDownIcon, XIcon } from "@/components/icons";

interface CustomerPanelProps {
  // Uden customer = "Tilføj"-tilstand (tomme felter, ny kunde). Med customer =
  // "Rediger"-tilstand (felterne forudfyldes, og id/marketingConsentStatus
  // bevares fra den eksisterende kunde i stedet for at blive gendannet).
  customer?: ShopifyCustomer;
  onClose: () => void;
  // "Tilføj"-tilstand kalder i praksis et RIGTIGT Shopify-kald (se
  // KunderClient.tsx's handleAddCustomer) og kan derfor fejle/tage tid –
  // onSave kan derfor returnere en Promise, som denne komponent selv venter
  // på og viser en tydelig loading-/fejltilstand for (samme mønster som
  // SaveTemplateDialog.tsx). "Rediger"-tilstand er fortsat en almindelig,
  // synkron, lokal opdatering.
  onSave: (customer: ShopifyCustomer) => void | Promise<void>;
}

const fieldClassName =
  "w-full rounded-xs border border-[#cfcfcf] bg-[#fdfdfd] px-3.5 py-2.5 text-sm text-[#111111] transition-colors focus:border-black focus:bg-white focus:outline-none";

export function CustomerPanel({ customer, onClose, onSave }: CustomerPanelProps) {
  const isEditing = Boolean(customer);
  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [customerType, setCustomerType] = useState<CustomerType>(
    customer?.tags.includes("erhverv") ? "erhverv" : "privat",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        id: customer?.id ?? crypto.randomUUID(),
        firstName,
        lastName,
        email,
        tags: [customerType],
        // Nye kunder tilføjet manuelt her antages at have givet samtykke, jf.
        // opgavebeskrivelsen. Ved redigering ændrer panelet ikke på samtykket –
        // kundens eksisterende marketingConsentStatus bevares uændret.
        marketingConsentStatus: customer?.marketingConsentStatus ?? "SUBSCRIBED",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      <button type="button" aria-label="Luk panel" onClick={onClose} className="absolute inset-0 bg-black/30" />

      <div className="relative flex h-full w-full max-w-96 flex-col border-l border-black bg-white font-grotesk shadow-[0_0_24px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="flex items-center gap-2 font-jetbrains text-xs font-bold tracking-widest text-black uppercase">
            <span className="h-1.5 w-1.5 bg-black" />
            {isEditing ? "Rediger kunde" : "Tilføj kunde"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-7 w-7 items-center justify-center rounded-xs border border-transparent text-[#888888] transition-colors hover:border-black hover:text-black"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
          <div className="flex flex-1 flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-jetbrains text-[11px] text-[#666666] uppercase">Fornavn</span>
              <input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-jetbrains text-[11px] text-[#666666] uppercase">Efternavn</span>
              <input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-jetbrains text-[11px] text-[#666666] uppercase">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-jetbrains text-[11px] text-[#666666] uppercase">Kundetype</span>
              <div className="relative">
                <select
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value as CustomerType)}
                  className="w-full cursor-pointer appearance-none rounded-xs border border-[#cfcfcf] bg-white px-3.5 py-2.5 pr-8 text-sm text-[#111111] transition-colors focus:border-black focus:outline-none"
                >
                  <option value="privat">Privat</option>
                  <option value="erhverv">Erhverv</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-[#555555]" />
              </div>
            </label>
          </div>

          {error && <p className="pt-3 font-jetbrains text-[11px] text-red-600">{error}</p>}

          <div className="flex items-center gap-2 border-t border-black/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded border border-neutral-300 bg-white font-jetbrains text-xs tracking-wider text-neutral-800 uppercase shadow-xs transition-colors hover:border-black hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annullér
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded bg-black font-jetbrains text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {isSaving ? (isEditing ? "Gemmer..." : "Tilføjer...") : isEditing ? "Gem ændringer" : "Tilføj kunde"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
