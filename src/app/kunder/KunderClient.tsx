"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerPanel } from "@/components/customers/CustomerPanel";
import { ImportCustomersButton, type ImportedFile } from "@/components/customers/ImportCustomersButton";
import { ErrorCard, LoadingCard } from "@/components/FetchStateCard";
import { getCustomerType, getCustomers, isActiveCustomer, type ShopifyCustomer } from "@/lib/customers";
import type { CustomerType } from "@/lib/format";
import { ChevronDownIcon, PlusIcon, SearchIcon, XIcon } from "@/components/icons";

interface ImportResult extends ImportedFile {
  count: number;
}

type PanelState = { mode: "add" } | { mode: "edit"; customer: ShopifyCustomer } | null;
type StatusFilter = "active" | "unsubscribed" | "";

const selectClassName =
  "w-full appearance-none rounded-lg border border-border bg-surface px-4 py-2 pr-8 text-[13px] text-ink-muted focus:outline-none";

interface KunderClientProps {
  initialCustomers: ShopifyCustomer[];
  initialError: string | null;
}

export function KunderClient({ initialCustomers, initialError }: KunderClientProps) {
  // Server-renderet ved første sideindlæsning (se kunder/page.tsx) – intet
  // klientside mount-fetch/loading-spinner for den almindelige, succesfulde
  // sti. isLoading bruges kun mens en fejl-retry er i gang.
  const [customers, setCustomers] = useState<ShopifyCustomer[]>(initialCustomers);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [search, setSearch] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [panel, setPanel] = useState<PanelState>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShopifyCustomer | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function retryLoadCustomers() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (query) {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        if (!fullName.includes(query) && !customer.email.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (customerTypeFilter && getCustomerType(customer) !== customerTypeFilter) {
        return false;
      }
      if (statusFilter) {
        const active = isActiveCustomer(customer);
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "unsubscribed" && active) return false;
      }
      return true;
    });
  }, [customers, search, customerTypeFilter, statusFilter]);

  function handleSaveCustomer(customer: ShopifyCustomer) {
    setCustomers((current) => {
      const exists = current.some((c) => c.id === customer.id);
      if (exists) {
        return current.map((c) => (c.id === customer.id ? customer : c));
      }
      return [...current, customer];
    });
    setPanel(null);
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setCustomers((current) => current.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function handleImport(file: ImportedFile) {
    // Ingen reel fil-parsing endnu – antallet er kun en visuel bekræftelse af,
    // at filen blev registreret, jf. opgavebeskrivelsen.
    setImportResult({ ...file, count: Math.floor(Math.random() * 18) + 3 });
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="customers" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader
          title="Kunder"
          subtitle={`${customers.length} kunder i alt`}
          rightSlot={
            <>
              <ImportCustomersButton onImport={handleImport} />
              <button
                type="button"
                onClick={() => setPanel({ mode: "add" })}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Tilføj kunde
              </button>
            </>
          }
        />

        {importResult && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-emerald-50 px-8 py-3">
            <p className="text-[13px] text-emerald-800">
              <span className="font-semibold">{importResult.count} kunder importeret</span> fra{" "}
              <span className="font-medium">{importResult.name}</span>
            </p>
            <button
              type="button"
              onClick={() => setImportResult(null)}
              aria-label="Luk"
              className="text-emerald-700 hover:text-emerald-900"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isLoading ? (
          <LoadingCard message="Henter kunder fra Shopify..." />
        ) : loadError ? (
          <ErrorCard title="Kunne ikke hente kunder" message={loadError} onRetry={retryLoadCustomers} />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border bg-surface px-8 py-3.5">
              <div className="relative min-w-[220px] max-w-sm flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Søg efter navn eller email..."
                  className="w-full rounded-lg border border-border bg-surface py-2 pr-4 pl-9 text-[13px] text-ink-muted placeholder:text-ink-faint focus:outline-none"
                />
              </div>

              <div className="relative">
                <select
                  value={customerTypeFilter}
                  onChange={(event) => setCustomerTypeFilter(event.target.value as CustomerType | "")}
                  className={selectClassName}
                >
                  <option value="">Kundetype: Alle</option>
                  <option value="privat">Privat</option>
                  <option value="erhverv">Erhverv</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-ink-muted" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className={selectClassName}
                >
                  <option value="">Status: Alle</option>
                  <option value="active">Aktiv</option>
                  <option value="unsubscribed">Afmeldt</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-ink-muted" />
              </div>
            </div>

            <CustomerTable
              customers={filteredCustomers}
              onEdit={(customer) => setPanel({ mode: "edit", customer })}
              onDelete={(customer) => setDeleteTarget(customer)}
            />
          </>
        )}
      </div>

      {panel && (
        <CustomerPanel
          customer={panel.mode === "edit" ? panel.customer : undefined}
          onClose={() => setPanel(null)}
          onSave={handleSaveCustomer}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Slet kunde"
          description={`Er du sikker på, du vil slette ${deleteTarget.firstName} ${deleteTarget.lastName}? Dette kan ikke fortrydes.`}
          confirmLabel="Slet"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
