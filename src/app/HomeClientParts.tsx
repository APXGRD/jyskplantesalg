"use client";

// Forsidens to klient-dele (Stitch-redesignet) – de læser/sætter
// nyhedsbrevs-udkastet i NewsletterContext, som kun findes i browseren.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNewsletter } from "@/context/NewsletterContext";
import type { CustomerType } from "@/lib/format";

export function PipelineCard() {
  const { result, customerType, instructions } = useNewsletter();
  const audience = customerType === "erhverv" ? "Erhvervskunder (B2B)" : "Privatkunder (B2C)";

  return (
    <div className="group flex flex-col justify-between rounded-lg border border-[#e4e4e7] bg-[#fafafa]/60 p-5 transition-colors hover:border-zinc-400">
      <div>
        <span className="flex items-center gap-1.5 font-jetbrains text-[11px] font-bold tracking-wider text-zinc-900 uppercase">
          <span className="h-1.5 w-1.5 bg-black" />
          02. Pipeline status
        </span>
        <div className="mt-4">
          <div className="font-jetbrains text-xs text-zinc-400 uppercase">Aktuelt udkast</div>
          <div className="mt-0.5 text-lg font-bold tracking-tight">
            {result ? "Udkast klar til preview" : "Klar til generering"}
          </div>
        </div>
        <p className="mt-3 text-xs leading-normal text-zinc-500">
          {result
            ? `Målgruppe: ${audience}.${instructions.trim() ? ` "${instructions.trim()}"` : ""}`
            : `Målgruppe: ${audience}. Beskriv nyhedsbrevet i Opsætning for at generere et udkast.`}
        </p>
      </div>
      <div className="mt-5 border-t border-dashed border-zinc-200 pt-4">
        <Link
          href={result ? "/preview" : "/opsaetning"}
          className="inline-flex items-center gap-1 font-jetbrains text-[11px] font-bold text-black uppercase transition-transform group-hover:translate-x-0.5"
        >
          {result ? "Fortsæt i Preview →" : "Start trin 01 →"}
        </Link>
      </div>
    </div>
  );
}

const QUICK_ACTIONS: { type: CustomerType; label: string }[] = [
  { type: "erhverv", label: "Opret nyt B2B-nyhedsbrev" },
  { type: "privat", label: "Opret nyt B2C-nyhedsbrev" },
];

// Vælger målgruppen og går direkte til Opsætning – samme valg, som man ellers
// selv træffer i "01. Målgruppe" dér.
export function QuickActions() {
  const router = useRouter();
  const { setCustomerType } = useNewsletter();

  return (
    <div className="space-y-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.type}
          type="button"
          onClick={() => {
            setCustomerType(action.type);
            router.push("/opsaetning");
          }}
          className="group flex w-full items-center justify-between rounded border border-zinc-200 bg-white px-3.5 py-2.5 text-xs shadow-sm transition-all hover:border-black"
        >
          <span className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full border border-black transition-colors group-hover:bg-black" />
            <span className="font-medium text-zinc-800">{action.label}</span>
          </span>
          <span className="font-jetbrains text-[10px] text-zinc-400 group-hover:text-black">START</span>
        </button>
      ))}
    </div>
  );
}
