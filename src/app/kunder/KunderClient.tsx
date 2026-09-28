"use client";

import { useMemo, useState } from "react";
import { SectionLabel, StitchShell } from "@/components/StitchShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerPanel } from "@/components/customers/CustomerPanel";
import { ImportCustomersButton, type ImportedFile } from "@/components/customers/ImportCustomersButton";
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
  "w-full cursor-pointer appearance-none rounded-sm border border-[#e5e7eb] bg-white py-2 pr-8 pl-3 font-jetbrains text-xs text-zinc-700 transition hover:border-zinc-400 focus:border-black focus:outline-none";

// Antal kunder pr. side i tabellen.
const PAGE_SIZE = 25;

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

  const [page, setPage] = useState(1);

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
      className="inline-flex items-center gap-1.5 border border-[#cfcfcf] bg-white px-3 py-1.5 font-jetbrains text-xs font-medium text-black uppercase shadow-sm transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSyncing ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <RefreshIcon className="h-3.5 w-3.5" />}
      {isSyncing ? "Synkroniserer..." : "Synkronisér"}
    </button>
  );

  // Tal til filter-dropdowns og Database oversigt – udledt af den fulde liste.
  const activeCount = customers.filter(isActiveCustomer).length;
  const unsubscribedCount = customers.length - activeCount;
  const b2bCount = customers.filter((customer) => getCustomerType(customer) === "erhverv").length;
  const b2cCount = customers.length - b2bCount;
  const activePercent = customers.length ? (activeCount / customers.length) * 100 : 0;

  // Ren visnings-paginering af den (fuldt) filtrerede liste – søgning og
  // filtre virker stadig på alle kunder.
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedCustomers = filteredCustomers.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <StitchShell active="customers">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Titel, handlinger og trinindikator */}
        <section className="border-b border-[#e5e5e5] bg-white px-4 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase sm:text-4xl">Kunder</h1>
              <div className="flex flex-wrap items-center gap-2 pt-4">
                {syncButton}
                <ImportCustomersButton onImport={handleImport} />
                <button
                  type="button"
                  onClick={() => setPanel({ mode: "add" })}
                  className="inline-flex items-center gap-1.5 bg-black px-3.5 py-1.5 font-jetbrains text-xs font-bold tracking-wider text-white uppercase shadow-sm transition hover:bg-neutral-800"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Tilføj kunde
                </button>
              </div>
            </div>
            <div className="text-right font-jetbrains">
              <div className="text-4xl font-bold tracking-tight">
                03<span className="font-light text-[#a0a0a0]">/04</span>
              </div>
              <div className="mt-2 text-[11px] text-[#666666]">
                {customers.length} kunder i alt
                {syncedAt && ` · Synkroniseret ${formatRelativeTime(new Date(syncedAt))}`}
              </div>
            </div>
          </div>
        </section>

        {syncError && (
          <p className="border-b border-[#e5e5e5] bg-red-50 px-4 py-2 font-jetbrains text-[11px] text-red-700 sm:px-8">
            {syncError}
          </p>
        )}

        {importResult && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white px-4 py-3 sm:px-8">
            <p className="flex items-center gap-2 font-jetbrains text-xs text-black">
              <span className="h-1.5 w-1.5 bg-black" />
              <span className="font-semibold">{importResult.count} kunder importeret</span> fra{" "}
              <span>{importResult.name}</span>
            </p>
            <button type="button" onClick={() => setImportResult(null)} aria-label="Luk" className="text-zinc-400 hover:text-black">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {unsubscribeError && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] bg-red-50 px-4 py-3 sm:px-8">
            <p className="font-jetbrains text-xs text-red-700">{unsubscribeError}</p>
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

        <main className="flex-1 bg-[#f8f9fa] px-4 py-8 sm:px-6 md:px-10">
          {isLoading ? (
            <p className="py-16 text-center font-jetbrains text-xs tracking-wider text-zinc-500 uppercase">
              Henter kunder...
            </p>
          ) : loadError ? (
            <div className="flex max-w-md flex-col gap-3 rounded-sm border border-red-200 bg-white p-6">
              <SectionLabel>Kunne ikke hente kunder</SectionLabel>
              <p className="text-sm text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={retryLoadCustomers}
                className="w-fit border border-[#cfcfcf] bg-white px-4 py-2 font-jetbrains text-xs tracking-wider uppercase hover:border-black"
              >
                Prøv igen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
              {/* Venstre: filtre + tabel */}
              <section className="flex min-w-0 flex-col gap-4 xl:col-span-9">
                <div className="flex flex-col items-stretch gap-2.5 rounded-sm border border-[#e5e7eb] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="relative w-full sm:w-80">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Søg efter navn eller email..."
                      aria-label="Søg efter navn eller email"
                      className="w-full rounded-sm border border-[#e5e7eb] bg-zinc-50 py-2 pr-3 pl-8 font-jetbrains text-xs text-black placeholder:text-zinc-400 transition focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                    />
                  </div>

                  <div className="relative w-full sm:w-auto">
                    <select
                      value={customerTypeFilter}
                      onChange={(event) => {
                        setCustomerTypeFilter(event.target.value as CustomerType | "");
                        setPage(1);
                      }}
                      aria-label="Filtrér på kundetype"
                      className={selectClassName}
                    >
                      <option value="">Kundetype: Alle</option>
                      <option value="privat">Privat ({b2cCount})</option>
                      <option value="erhverv">Erhverv [B2B] ({b2bCount})</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-zinc-400" />
                  </div>

                  <div className="relative w-full sm:w-auto">
                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value as StatusFilter);
                        setPage(1);
                      }}
                      aria-label="Filtrér på status"
                      className={selectClassName}
                    >
                      <option value="">Status: Alle</option>
                      <option value="active">Aktiv ({activeCount})</option>
                      <option value="unsubscribed">Afmeldt ({unsubscribedCount})</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                <div className="overflow-hidden rounded-sm border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <CustomerTable
                    customers={pagedCustomers}
                    onEdit={(customer) => setPanel({ mode: "edit", customer })}
                    onUnsubscribe={handleUnsubscribeClick}
                  />

                  <div className="flex flex-col items-center justify-between gap-3 border-t border-[#e5e7eb] bg-zinc-50 px-5 py-3.5 font-jetbrains text-xs sm:flex-row">
                    <span className="text-zinc-500">
                      Viser{" "}
                      <span className="font-semibold text-black">
                        {filteredCustomers.length === 0
                          ? "0"
                          : `${pageStart + 1}-${pageStart + pagedCustomers.length}`}
                      </span>{" "}
                      af {filteredCustomers.length} kunder
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-sm border border-[#e5e7eb] bg-white px-2.5 py-1 text-zinc-700 uppercase transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:text-zinc-400 disabled:opacity-40 disabled:hover:border-[#e5e7eb]"
                      >
                        ← Forrige
                      </button>
                      <span className="rounded-sm border border-black bg-white px-3 py-1 font-semibold text-black">
                        {currentPage}
                      </span>
                      <span className="px-1 text-zinc-400">af {pageCount}</span>
                      <button
                        type="button"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage >= pageCount}
                        className="rounded-sm border border-[#e5e7eb] bg-white px-2.5 py-1 text-zinc-700 uppercase transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:text-zinc-400 disabled:opacity-40 disabled:hover:border-[#e5e7eb]"
                      >
                        Næste →
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Højre: database-oversigt */}
              <aside className="xl:col-span-3">
                <div className="flex flex-col gap-3 rounded-sm border border-[#e5e7eb] bg-white p-4 font-jetbrains shadow-sm">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold tracking-tight text-zinc-600 uppercase">01 // Database oversigt</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                      TOTAL: {customers.length}
                    </span>
                  </div>
                  <div
                    className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100"
                    title={`${Math.round(activePercent)}% aktive`}
                  >
                    <div className="h-full bg-emerald-500" style={{ width: `${activePercent}%` }} />
                    <div className="h-full flex-1 bg-zinc-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="rounded border border-zinc-200 bg-zinc-50 p-2.5">
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">Aktive modtagere</div>
                      <div className="mt-0.5 text-base font-bold text-black">{activeCount}</div>
                    </div>
                    <div className="rounded border border-zinc-200 bg-zinc-50 p-2.5">
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">Afmeldte</div>
                      <div className="mt-0.5 text-base font-bold text-zinc-700">{unsubscribedCount}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-xs text-zinc-600">
                    <span>Erhvervskunder (B2B):</span>
                    <span className="font-bold text-black">{b2bCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>Privatkunder (B2C):</span>
                    <span className="font-bold text-black">{b2cCount}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </main>
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
          description={`Er du sikker på, du vil afmelde ${`${unsubscribeTarget.firstName} ${unsubscribeTarget.lastName}`.trim() || unsubscribeTarget.email} fra markedsføring? Kunden forbliver på listen med status "Afmeldt".`}
          confirmLabel="Afmeld"
          onConfirm={handleUnsubscribeConfirmed}
          onCancel={() => setUnsubscribeTarget(null)}
        />
      )}
    </StitchShell>
  );
}
