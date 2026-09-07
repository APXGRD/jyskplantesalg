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
  onSave: (customer: ShopifyCustomer) => void;
}

const fieldClassName =
  "w-full rounded-lg border border-border px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink-faintest";

export function CustomerPanel({ customer, onClose, onSave }: CustomerPanelProps) {
  const isEditing = Boolean(customer);
  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [customerType, setCustomerType] = useState<CustomerType>(
    customer?.tags.includes("erhverv") ? "erhverv" : "privat",
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave({
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
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      <button type="button" aria-label="Luk panel" onClick={onClose} className="absolute inset-0 bg-black/30" />

      <div className="relative flex h-full w-96 flex-col border-l border-border bg-white shadow-[0_0_24px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">{isEditing ? "Rediger kunde" : "Tilføj kunde"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faintest hover:bg-surface-active hover:text-ink-muted"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
          <div className="flex flex-1 flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-muted">Fornavn</span>
              <input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-muted">Efternavn</span>
              <input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-muted">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-muted">Kundetype</span>
              <div className="relative">
                <select
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value as CustomerType)}
                  className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-8 text-[13px] text-ink focus:outline-none"
                >
                  <option value="privat">Privat</option>
                  <option value="erhverv">Erhverv</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-ink-muted" />
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active"
            >
              Annullér
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              {isEditing ? "Gem ændringer" : "Tilføj kunde"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
