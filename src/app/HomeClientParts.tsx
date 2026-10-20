"use client";

// Forsidens klient-del – den læser
// nyhedsbrevs-udkastet i NewsletterContext, som kun findes i browseren.

import Link from "next/link";
import { useNewsletter } from "@/context/NewsletterContext";
import { ArrowRightIcon, ImagePlaceholderIcon } from "@/components/icons";

// Forsidens kort i Stitch-redesignet – delt med page.tsx's to server-kort.
export const homeCardClassName =
  "group flex flex-col justify-between rounded-sm border border-hairline bg-white p-7 transition-colors duration-200 hover:border-forest";
export const homeCardHeaderClassName = "flex items-center justify-between border-b border-hairline/60 pb-6";
export const homeLabelClassName = "text-xs leading-[1.2] font-semibold tracking-widest text-stone uppercase";
export const homeCardFooterClassName = "mt-8 border-t border-hairline/60 pt-8";
export const homeCardLinkClassName =
  "inline-flex items-center gap-1.5 text-sm font-medium text-forest transition-colors group-hover:text-forest-hover";

export function PipelineCard() {
  const { result, customerType, instructions, blocks, topicMatchedProductIds } = useNewsletter();
  const audience = customerType === "erhverv" ? "Erhvervskunder (B2B)" : "Privatkunder (B2C)";
  const trimmedInstructions = instructions.trim();
  const visibleBlockCount = blocks.filter((block) => !block.hidden).length;
  const matchedProductCount = topicMatchedProductIds?.length ?? 0;

  return (
    <div className={homeCardClassName}>
      <div>
        <div className={homeCardHeaderClassName}>
          <h2 className={homeLabelClassName}>02. Pipeline status</h2>
        </div>
        <div className="pt-6 pb-2">
          <span className="block font-garamond text-2xl leading-[1.35] font-medium text-forest">
            {result ? "Udkast klar til preview" : "Klar til generering"}
          </span>
          <div className="mt-4 rounded-xs border border-hairline/70 p-3">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-stone uppercase">Målgruppe: {audience}</div>
            <p className="line-clamp-2 font-garamond text-sm leading-snug text-ink-deep italic">
              {result
                ? trimmedInstructions
                  ? `“${trimmedInstructions}”`
                  : "Ingen beskrivelse angivet."
                : "Beskriv nyhedsbrevet i Opsætning for at generere et udkast."}
            </p>
          </div>
          {result && (
            <div className="mt-3 flex items-center gap-3 text-xs text-stone">
              <span>
                {visibleBlockCount} {visibleBlockCount === 1 ? "blok" : "blokke"}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <ImagePlaceholderIcon className="h-3.5 w-3.5" />
                {matchedProductCount} {matchedProductCount === 1 ? "produkt" : "produkter"} matchet
              </span>
            </div>
          )}
        </div>
      </div>
      <div className={homeCardFooterClassName}>
        <Link href={result ? "/preview" : "/opsaetning"} className={homeCardLinkClassName}>
          {result ? "Fortsæt i Preview" : "Start trin 01"}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
