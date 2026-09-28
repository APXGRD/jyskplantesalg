"use client";

// Fælles ramme for siderne i "industrial" redesignet (Stitch): grå
// baggrund, ét stort kort med topbar, sidens indhold og en footer med
// firmanavn + "Inviter bruger".

import type { ReactNode } from "react";
import Link from "next/link";
import { TopNav, type TopNavPage } from "@/components/TopNav";
import { useBrandSettings } from "@/context/BrandSettingsContext";

export function StitchShell({
  active,
  previewName,
  children,
}: {
  active?: TopNavPage;
  previewName?: string;
  children: ReactNode;
}) {
  const settings = useBrandSettings();
  const companyName = (previewName ?? settings.name).trim();

  return (
    <div className="min-h-screen w-full bg-[#EAEAEA] font-grotesk text-[#111111] antialiased selection:bg-black selection:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-430 flex-col p-3 sm:p-6 lg:p-8">
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border border-black/15 bg-[#FAFAFA] bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-size-[25%_100%] shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <TopNav active={active} previewName={previewName} />
          {children}
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 bg-white px-4 py-3 font-jetbrains text-[10px] text-[#71717A] sm:px-6">
            <span className="font-bold tracking-wider text-black uppercase">{companyName || "Logo"}</span>
            <Link href="/inviter" className="font-medium text-black uppercase hover:underline">
              + Inviter bruger
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

// Lille sort firkant + mono-label – sektionsoverskrift i redesignet.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 font-jetbrains text-[11px] font-semibold tracking-widest text-black uppercase">
      <span className="h-1.5 w-1.5 bg-black" />
      {children}
    </span>
  );
}
