"use client";

// Forsidens klient-del – den læser den valgte målgruppe i
// NewsletterContext, som kun findes i browseren.

import Link from "next/link";
import { useNewsletter } from "@/context/NewsletterContext";
import { ArrowRightIcon } from "@/components/icons";

// Forsidens kort i Stitch-redesignet – delt med page.tsx's to server-kort.
export const homeCardClassName =
  "group flex flex-col justify-between rounded-sm border border-hairline bg-white p-7 transition-colors duration-200 hover:border-forest";
export const homeCardHeaderClassName = "flex items-center justify-between border-b border-hairline/60 pb-6";
export const homeLabelClassName = "text-xs leading-[1.2] font-semibold tracking-widest text-stone uppercase";
export const homeCardFooterClassName = "mt-8 border-t border-hairline/60 pt-8";
export const homeCardLinkClassName =
  "inline-flex items-center gap-1.5 text-sm font-medium text-forest transition-colors group-hover:text-forest-hover";

// Forsidens midterste kort fører altid til Opsætning – hvor et nyt
// nyhedsbrev beskrives og genereres. Viser den aktuelt valgte målgruppe.
export function PipelineCard() {
  const { customerType } = useNewsletter();
  const audience = customerType === "erhverv" ? "Erhvervskunder (B2B)" : "Privatkunder (B2C)";

  return (
    <div className={homeCardClassName}>
      <div>
        <div className={homeCardHeaderClassName}>
          <h2 className={homeLabelClassName}>02. Nyt nyhedsbrev</h2>
        </div>
        <div className="pt-6 pb-2">
          <span className="block font-garamond text-2xl leading-[1.35] font-medium text-forest">
            Lav et nyt nyhedsbrev
          </span>
          <div className="mt-4 rounded-xs border border-hairline/70 p-3">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-stone uppercase">Målgruppe: {audience}</div>
            <p className="font-garamond text-sm leading-snug text-ink-deep italic">
              Vælg målgruppe og beskriv indholdet i Opsætning – så laver AI&apos;en et udkast, du kan rette til.
            </p>
          </div>
        </div>
      </div>
      <div className={homeCardFooterClassName}>
        <Link href="/opsaetning" className={homeCardLinkClassName}>
          Gå til opsætning
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
