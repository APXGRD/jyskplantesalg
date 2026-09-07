import Link from "next/link";
import { mockCustomers } from "@/lib/mock/mockCustomers";
import { ChevronRightIcon, LeafIcon, UsersIcon } from "@/components/icons";

export default function HomePage() {
  const activeCustomerCount = mockCustomers.filter(
    (customer) => customer.marketingConsentStatus === "SUBSCRIBED",
  ).length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
          <LeafIcon className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center leading-tight">
          <h1 className="text-2xl font-semibold tracking-wide text-ink uppercase">JYSK Plantesalg</h1>
          <p className="text-sm text-ink-muted">Nyhedsbrev-generator</p>
        </div>
      </div>

      <div className="flex items-stretch gap-4">
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface px-7 py-4">
          <span className="text-2xl font-semibold text-ink">{activeCustomerCount}</span>
          <span className="text-xs text-ink-muted">Aktive kunder</span>
        </div>
        <Link
          href="/kunder"
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-7 py-4 text-ink-muted hover:bg-surface-active hover:text-ink"
        >
          <UsersIcon className="h-5 w-5" />
          <span className="text-xs font-medium">Gå til Kunder</span>
        </Link>
      </div>

      <Link
        href="/produkter"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Kom i gang
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
