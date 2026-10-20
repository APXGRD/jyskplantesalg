"use client";

// Ramme for siderne i Figma-redesignet (JYSK PLANTESALG): lys baggrund,
// grøn topbar i Libre Baskerville med samme navigation, email og log ud som
// TopNav, og "Inviter bruger" nederst til højre.

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { HOME_ITEM, NAV_ITEMS, useUserEmail, type TopNavPage } from "@/components/TopNav";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import { logout } from "@/app/login/actions";

// Designets egne menu-tekster (samme sider og rækkefølge som TopNav).
const PLANT_LABELS: Partial<Record<TopNavPage, string>> = { preview: "Preview & edit" };

// previewName: live-forhåndsvisning af firmanavnet, mens det skrives på
// Indstillinger-siden (før gem) – samme som TopNav/StitchShell.
export function PlantShell({
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
  const userEmail = useUserEmail();

  return (
    <div className="flex min-h-screen w-full flex-col bg-plant-bg font-sfpro text-plant antialiased">
      <header className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b-[0.5px] border-plant px-4 pt-[20px] pb-5 font-baskerville sm:px-[24px] lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          {/* Kun et UPLOADET logo vises – uden logo står firmanavnet alene (ingen
              automatisk genereret logo). */}
          {settings.logoData && (
            // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
            <img src={settings.logoData} alt="" className="h-8 w-8 shrink-0 object-contain" />
          )}
          <span
            className={`truncate text-[20px] leading-[1.5] tracking-[1px] ${companyName ? "" : "opacity-30"}`}
            title={companyName || "Logo"}
          >
            {companyName || "Logo"}
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-[19px] gap-y-2">
          {[HOME_ITEM, ...NAV_ITEMS].map((item) => {
            const isActive = item.id === active;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`border-b text-[17px] leading-[1.5] tracking-[1px] whitespace-nowrap transition-colors ${
                  isActive ? "border-plant" : "border-transparent hover:border-plant/40"
                }`}
              >
                {PLANT_LABELS[item.id] ?? item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center lg:h-[77px] lg:justify-self-stretch lg:border-l lg:border-plant">
          {userEmail && (
            <span className="truncate text-[17px] leading-[1.5] tracking-[1px] lg:flex-1 lg:text-center">
              {userEmail}
            </span>
          )}
        </div>

        <form action={logout} className="absolute top-[20px] right-4 sm:right-[31px]">
          <button type="submit" className="text-[8px] leading-[1.5] tracking-[0.5px] uppercase hover:underline">
            Log ud
          </button>
        </form>
      </header>

      {children}

      <footer className="flex justify-end px-4 pt-[83px] pb-20 sm:px-[45px]">
        <Link href="/inviter" className="flex items-center gap-[4px] text-[14px] leading-[1.5] tracking-[0.8px] hover:underline">
          <Image src="/plus.svg" alt="" width={15} height={13} unoptimized style={{ width: 15, height: "auto" }} />
          Inviter bruger
        </Link>
      </footer>
    </div>
  );
}
