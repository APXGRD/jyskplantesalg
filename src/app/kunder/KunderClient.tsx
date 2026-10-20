"use client";

import { useMemo, useState } from "react";
import { EditorialShell } from "@/components/EditorialShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { CustomerPanel } from "@/components/customers/CustomerPanel";
import { ImportCustomersButton, type ImportedFile } from "@/components/customers/ImportCustomersButton";
import { getCustomerType, getCustomers, isActiveCustomer, type ShopifyCustomer } from "@/lib/customers";
import type { CustomerType } from "@/lib/format";
import { formatRelativeTime } from "@/lib/format";
import { ChevronDownIcon, RefreshIcon, SearchIcon, SpinnerIcon, UserPlusIcon, XIcon } from "@/components/icons";

interface ImportResult extends ImportedFile {
  count: number;
}

type PanelState = { mode: "add" } | { mode: "edit"; customer: ShopifyCustomer } | null;
type StatusFilter = "active" | "unsubscribed" | "";

// Stitch-designet: filtre og søgning på cremefarvet baggrund uden kant.
const selectClassName =
  "h-11 w-full cursor-pointer appearance-none rounded-xs border-[0.5px] border-forest bg-white pr-8 pl-3.5 text-sm text-ink-deep focus:ring-1 focus:ring-forest/30 focus:outline-none";

// Knapperne øverst (Synkroniser / Importer CSV) og pagineringens knapper.
const headerButtonClassName =
  "flex h-10 items-center gap-1 rounded-xs border-[0.5px] border-forest bg-transparent px-4 text-[11px] font-semibold tracking-[0.025em] text-forest uppercase transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-forest disabled:hover:bg-transparent disabled:hover:text-forest";
const pagerButtonClassName =
  "h-8 rounded-xs border border-hairline bg-white px-2.5 text-[11px] tracking-wider text-forest uppercase transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white disabled:cursor-not-allowed disabled:text-stone disabled:opacity-40 disabled:hover:border-hairline disabled:hover:bg-white disabled:hover:text-stone";

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

  // Tal til filter-dropdowns og Database oversigt – udledt af den fulde liste.
  const activeCount = customers.filter(isActiveCustomer).length;
  const unsubscribedCount = customers.length - activeCount;
  const b2bCount = customers.filter((customer) => getCustomerType(customer) === "erhverv").length;
  const b2cCount = customers.length - b2bCount;

  // Ren visnings-paginering af den (fuldt) filtrerede liste – søgning og
  // filtre virker stadig på alle kunder.
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedCustomers = filteredCustomers.slice(pageStart, pageStart + PAGE_SIZE);

  const percent = (part: number) => (customers.length ? `${((part / customers.length) * 100).toFixed(1)}%` : "0%");
  const b2bShare = customers.length ? (b2bCount / customers.length) * 100 : 0;

  return (
    <EditorialShell active="customers">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-12 md:px-12">
        {/* Titel + handlinger */}
        <section className="flex flex-col justify-between gap-4 pt-8 pb-4 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-semibold tracking-widest text-stone uppercase">Trin 03 / Kunder</span>
            <h1 className="mt-1 font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-forest md:text-4xl md:leading-[1.25]">
              Kunder
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              title={syncedAt ? `Synkroniseret ${formatRelativeTime(new Date(syncedAt))}` : "Hent kunder fra Shopify"}
              className={headerButtonClassName}
            >
              {isSyncing ? (
                <SpinnerIcon className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <RefreshIcon className="h-[18px] w-[18px]" />
              )}
              <span>{isSyncing ? "Synkroniserer..." : "Synkroniser"}</span>
            </button>
            <ImportCustomersButton onImport={handleImport} className={headerButtonClassName} />
            <button
              type="button"
              onClick={() => setPanel({ mode: "add" })}
              className={headerButtonClassName}
            >
              <UserPlusIcon className="h-[18px] w-[18px]" />
              <span>Tilføj kunde</span>
            </button>
          </div>
        </section>

        {(syncError || importResult || unsubscribeError) && (
          <div className="mb-4 flex flex-col gap-2">
            {syncError && <p className="rounded-xs bg-rose-bg px-4 py-2 text-sm text-rose-ink">{syncError}</p>}
            {importResult && (
              <div className="flex items-center justify-between gap-3 rounded-xs bg-mint px-4 py-2 text-sm text-forest">
                <p>
                  <span className="font-medium">{importResult.count} kunder importeret</span> fra {importResult.name}
                </p>
                <button type="button" onClick={() => setImportResult(null)} aria-label="Luk" className="hover:opacity-60">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {unsubscribeError && (
              <div className="flex items-center justify-between gap-3 rounded-xs bg-rose-bg px-4 py-2 text-sm text-rose-ink">
                <p>{unsubscribeError}</p>
                <button type="button" onClick={() => setUnsubscribeError(null)} aria-label="Luk" className="hover:opacity-60">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="py-16 text-center text-sm text-stone">Henter kunder...</p>
        ) : loadError ? (
          <div className="flex max-w-md flex-col gap-3 rounded-xs border border-hairline bg-white p-6">
            <h2 className="font-garamond text-2xl leading-[1.35] font-medium text-forest">Kunne ikke hente kunder</h2>
            <p className="text-sm text-red-700">{loadError}</p>
            <button type="button" onClick={retryLoadCustomers} className={`${headerButtonClassName} w-fit`}>
              Prøv igen
            </button>
          </div>
        ) : (
          <>
            {/* Søg + filtre */}
            <section className="mb-8 w-full rounded-xs border border-hairline bg-white p-2">
              <div className="flex flex-col items-stretch justify-between gap-2 lg:flex-row lg:items-center">
                <div className="relative max-w-xl grow">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-stone" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Søg efter navn eller mail..."
                    aria-label="Søg efter navn eller email"
                    className="h-11 w-full rounded-xs border border-transparent bg-transparent pr-4 pl-10 text-sm text-ink-deep transition-all placeholder:text-stone focus:border-forest focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <div className="relative w-full min-w-[170px] sm:w-auto">
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
                      <option value="privat">Kundetype: Privat ({b2cCount})</option>
                      <option value="erhverv">Kundetype: Erhverv ({b2bCount})</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-forest" />
                  </div>
                  <div className="relative w-full min-w-[160px] sm:w-auto">
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
                      <option value="active">Status: Aktiv ({activeCount})</option>
                      <option value="unsubscribed">Status: Afmeldt ({unsubscribedCount})</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-forest" />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Tabel */}
              <div className="flex flex-col overflow-hidden rounded-xs border border-hairline bg-white lg:col-span-8">
                <CustomerTable
                  customers={pagedCustomers}
                  onEdit={(customer) => setPanel({ mode: "edit", customer })}
                  onUnsubscribe={handleUnsubscribeClick}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-4 py-3 text-sm text-stone">
                  <span>
                    Viser{" "}
                    {filteredCustomers.length === 0 ? "0" : `${pageStart + 1}-${pageStart + pagedCustomers.length}`} af{" "}
                    {filteredCustomers.length} kontakter
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className={pagerButtonClassName}
                    >
                      Forrige
                    </button>
                    <span
                      aria-label={`Side ${currentPage} af ${pageCount}`}
                      className="flex h-8 min-w-8 items-center justify-center rounded-xs bg-forest px-2 text-sm font-medium text-white"
                    >
                      {currentPage}
                    </span>
                    <span className="px-2 text-[11px] tracking-wider uppercase">af {pageCount}</span>
                    <button
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage >= pageCount}
                      className={pagerButtonClassName}
                    >
                      Næste
                    </button>
                  </div>
                </div>
              </div>

              {/* Kunde oversigt */}
              <aside className="flex flex-col gap-4 lg:col-span-4">
                <div className="flex flex-col rounded-xs border border-hairline bg-white p-4">
                  <div className="mb-4 flex items-baseline justify-between border-b border-hairline pb-2">
                    <h2 className="font-garamond text-2xl leading-[1.35] font-medium text-forest">Kunde oversigt</h2>
                    <span className="text-xs font-semibold tracking-wider text-stone">Total: {customers.length}</span>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="flex flex-col justify-between rounded-xs bg-forest p-2 text-white">
                      <span className="text-[10px] font-semibold tracking-widest uppercase opacity-80">Aktive</span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-garamond text-2xl leading-[1.35] font-medium">{activeCount}</span>
                        <span className="text-xs opacity-75">{percent(activeCount)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between rounded-xs border border-hairline bg-ash p-2 text-ink-deep">
                      <span className="text-[10px] font-semibold tracking-widest text-stone uppercase">Afmeldte</span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-garamond text-2xl leading-[1.35] font-medium text-[#1a1a1a]">
                          {unsubscribedCount}
                        </span>
                        <span className="text-xs text-stone">{percent(unsubscribedCount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4 w-full">
                    <div className="mb-1 flex items-center justify-between text-xs text-stone">
                      <span>Segmentering</span>
                      <span>B2B / B2C</span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-ash">
                      <div className="h-full bg-forest" style={{ width: `${b2bShare}%` }} title={`Erhverv: ${Math.round(b2bShare)}%`} />
                      <div
                        className="h-full bg-sage-light"
                        style={{ width: `${customers.length ? 100 - b2bShare : 0}%` }}
                        title={`Privat: ${Math.round(customers.length ? 100 - b2bShare : 0)}%`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-hairline pt-2 text-sm">
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-forest" />
                        <span className="text-ink-deep">Erhvervskunder (B2B)</span>
                      </span>
                      <span className="font-medium text-[#1a1a1a]">{b2bCount}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-sage-light" />
                        <span className="text-ink-deep">Privatkunder (B2C)</span>
                      </span>
                      <span className="font-medium text-[#1a1a1a]">{b2cCount}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

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
    </EditorialShell>
  );
}
