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
import { formatRelativeTime } from "@/lib/format";
import { ChevronDownIcon, PlusIcon, RefreshIcon, SearchIcon, SpinnerIcon, XIcon } from "@/components/icons";

interface ImportResult extends ImportedFile {
  count: number;
}

type PanelState = { mode: "add" } | { mode: "edit"; customer: ShopifyCustomer } | null;
type StatusFilter = "active" | "unsubscribed" | "";

const selectClassName =
  "w-full appearance-none rounded-lg border border-border bg-surface px-4 py-2 pr-8 text-[13px] text-ink-muted focus:outline-none";

interface KunderClientProps {
  initialCustomers: ShopifyCustomer[];
  initialSyncedAt: string | null;
  initialError: string | null;
}

export function KunderClient({ initialCustomers, initialSyncedAt, initialError }: KunderClientProps) {
  // Server-renderet ved første sideindlæsning (se kunder/page.tsx) – intet
  // klientside mount-fetch/loading-spinner for den almindelige, succesfulde
  // sti. isLoading bruges kun mens en fejl-retry er i gang.
  const [customers, setCustomers] = useState<ShopifyCustomer[]>(initialCustomers);
  const [syncedAt, setSyncedAt] = useState<string | null>(initialSyncedAt);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialError);

  // "Synkroniser kunder" – genopbygger HELE cachen fra Shopify, til brug hvis
  // nogen har ændret noget direkte i Shopifys egen admin, uden om appen.
  // Almindelige tilføj/afmeld-handlinger i appen opdaterer i stedet cachen
  // øjeblikkeligt, én kunde ad gangen (se handleAddCustomer/
  // handleUnsubscribeConfirmed herunder) – IKKE via denne knap.
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [panel, setPanel] = useState<PanelState>(null);
  // Kunden, der venter på bekræftelse af afmelding i ConfirmDialog herunder.
  const [unsubscribeTarget, setUnsubscribeTarget] = useState<ShopifyCustomer | null>(null);
  const [unsubscribeError, setUnsubscribeError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function retryLoadCustomers() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { customers: freshCustomers, syncedAt: freshSyncedAt } = await getCustomers();
      setCustomers(freshCustomers);
      setSyncedAt(freshSyncedAt);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/customers/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Kunne ikke synkronisere kunder fra Shopify.");
      }
      const { customers: freshCustomers, syncedAt: freshSyncedAt } = await getCustomers();
      setCustomers(freshCustomers);
      setSyncedAt(freshSyncedAt);
      setLoadError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    } finally {
      setIsSyncing(false);
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

  // "Tilføj"-tilstand: skriver TIL SHOPIFY FØRST (customerCreate, se
  // customers/create/route.ts) – Shopify er den reelle kilde, af juridiske
  // grunde. Kastes en fejl, fanger CustomerPanel.tsx den selv og viser den i
  // panelet, som forbliver åbent (se CustomerPanel's egen isSaving/error-
  // håndtering). Panelet lukkes derfor KUN her, ved bekræftet succes, med
  // den RIGTIGE kunde (rigtigt Shopify-id), ikke panelets egen midlertidige
  // crypto.randomUUID()-placeholder.
  async function handleAddCustomer(customer: ShopifyCustomer) {
    const response = await fetch("/api/customers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        customerType: getCustomerType(customer),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Kunne ikke oprette kunden i Shopify. Prøv igen.");
    }
    const created: ShopifyCustomer = await response.json();
    setCustomers((current) => [...current, created]);
    setPanel(null);
  }

  // "Rediger"-tilstand: ren, lokal opdatering – IKKE en del af denne opgave
  // (kun "Tilføj kunde" og "Afmeld kunde" skal skrive til Shopify), forbliver
  // derfor uændret.
  function handleEditCustomer(customer: ShopifyCustomer) {
    setCustomers((current) => current.map((c) => (c.id === customer.id ? customer : c)));
    setPanel(null);
  }

  function handleUnsubscribeClick(customer: ShopifyCustomer) {
    setUnsubscribeError(null);
    setUnsubscribeTarget(customer);
  }

  // Skriver TIL SHOPIFY FØRST (customerEmailMarketingConsentUpdate, se
  // customers/unsubscribe/route.ts) – Shopify er den reelle kilde til
  // samtykke-status, af juridiske grunde. Opdaterer status optimistisk med
  // det samme (samme mønster som skabelon-sletning i OpsaetningClient.tsx),
  // men ruller tilbage til kundens oprindelige status, hvis selve
  // Shopify-kaldet fejler – kunden må ALDRIG fremstå afmeldt i UI'et, uden at
  // Shopify rent faktisk har bekræftet det. Kunden fjernes IKKE fra listen –
  // den forbliver synlig, nu med status "Afmeldt".
  async function handleUnsubscribeConfirmed() {
    if (!unsubscribeTarget) return;
    const target = unsubscribeTarget;
    setUnsubscribeTarget(null);
    setCustomers((current) =>
      current.map((c) => (c.id === target.id ? { ...c, marketingConsentStatus: "UNSUBSCRIBED" } : c)),
    );
    try {
      const response = await fetch("/api/customers/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: target.id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Kunne ikke afmelde kunden. Prøv igen.");
      }
      const updated: ShopifyCustomer = await response.json();
      setCustomers((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setCustomers((current) => current.map((c) => (c.id === target.id ? target : c)));
      setUnsubscribeError(err instanceof Error ? err.message : "Der skete en uventet fejl.");
    }
  }

  function handleImport(file: ImportedFile) {
    // Ingen reel fil-parsing endnu – antallet er kun en visuel bekræftelse af,
    // at filen blev registreret, jf. opgavebeskrivelsen.
    setImportResult({ ...file, count: Math.floor(Math.random() * 18) + 3 });
  }

  const syncButton = (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSyncing ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <RefreshIcon className="h-3.5 w-3.5" />}
      {isSyncing ? "Synkroniserer..." : "Synkroniser kunder"}
    </button>
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar active="customers" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader
          title="Kunder"
          subtitle={`${customers.length} kunder i alt`}
          rightSlot={
            <>
              {syncedAt && (
                <span className="text-[12px] text-ink-faint">
                  Sidst synkroniseret: {formatRelativeTime(new Date(syncedAt))}
                </span>
              )}
              {syncButton}
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

        {syncError && (
          <p className="border-b border-border bg-surface px-4 py-2 text-[12px] text-red-600 md:px-8">{syncError}</p>
        )}

        {importResult && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-emerald-50 px-4 py-3 md:px-8">
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

        {unsubscribeError && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-red-50 px-4 py-3 md:px-8">
            <p className="text-[13px] text-red-800">{unsubscribeError}</p>
            <button
              type="button"
              onClick={() => setUnsubscribeError(null)}
              aria-label="Luk"
              className="text-red-700 hover:text-red-900"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isLoading ? (
          <LoadingCard message="Henter kunder..." />
        ) : loadError ? (
          <ErrorCard title="Kunne ikke hente kunder" message={loadError} onRetry={retryLoadCustomers} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3.5 md:px-8">
              <div className="relative min-w-40 max-w-sm flex-1 sm:min-w-55">
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
              onUnsubscribe={handleUnsubscribeClick}
            />
          </>
        )}
      </div>

      {panel && (
        <CustomerPanel
          customer={panel.mode === "edit" ? panel.customer : undefined}
          onClose={() => setPanel(null)}
          onSave={panel.mode === "edit" ? handleEditCustomer : handleAddCustomer}
        />
      )}

      {unsubscribeTarget && (
        <ConfirmDialog
          title="Afmeld kunde"
          description={`Er du sikker på, du vil afmelde ${unsubscribeTarget.firstName} ${unsubscribeTarget.lastName} fra markedsføring? Kunden forbliver på listen med status "Afmeldt".`}
          confirmLabel="Afmeld"
          onConfirm={handleUnsubscribeConfirmed}
          onCancel={() => setUnsubscribeTarget(null)}
        />
      )}
    </div>
  );
}
