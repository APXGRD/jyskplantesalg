"use client";

// Topbar fra Opsætning-sidens "industrial" redesign (Stitch) – erstatter
// Sidebar på de sider, der er migreret til det nye design. Samme
// navigationspunkter, log ud og firmanavn (inkl. "Logo"-placeholder) som
// Sidebar.tsx.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";

export type TopNavPage = "home" | "settings" | "preview" | "customers" | "brand-settings";

// "00 / Forside" står altid først i navigationen.
const HOME_ITEM: { id: TopNavPage; label: string; href: string } = { id: "home", label: "Forside", href: "/" };

const NAV_ITEMS: { id: TopNavPage; label: string; href: string }[] = [
  { id: "settings", label: "Opsætning", href: "/opsaetning" },
  { id: "preview", label: "Preview & Rediger", href: "/preview" },
  { id: "customers", label: "Kunder", href: "/kunder" },
  { id: "brand-settings", label: "Indstillinger", href: "/indstillinger" },
];

// previewName: live-forhåndsvisning af firmanavnet, mens det skrives på
// Indstillinger-siden (før gem) – tomt felt viser "Logo"-placeholderen.
export function TopNav({ active, previewName }: { active?: TopNavPage; previewName?: string }) {
  const settings = useBrandSettings();
  const companyName = (previewName ?? settings.name).trim();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setUserEmail(data.user?.email ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Desktop (lg): tre-kolonne-grid med lige brede sidekolonner, så menuen
  // altid står præcis i midten – uanset firmanavnets og emailens bredde.
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white/70 px-4 py-4 backdrop-blur-md sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-3">
        {/* Kun et UPLOADET logo vises – uden logo står firmanavnet alene (ingen
            automatisk genereret logo). */}
        {settings.logoData && (
          // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
          <img src={settings.logoData} alt="" className="h-7 w-7 shrink-0 object-contain" />
        )}
        <span
          className={`truncate text-lg leading-none font-bold tracking-tight uppercase ${
            companyName ? "text-[#111111]" : "text-black/30"
          }`}
          title={companyName || "Logo"}
        >
          {companyName || "Logo"}
        </span>
      </div>

      <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
        {[HOME_ITEM, ...NAV_ITEMS].map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded px-3 py-1.5 font-jetbrains text-xs tracking-wider uppercase transition-colors ${
                isActive ? "bg-black font-semibold text-white" : "text-[#71717A] hover:text-black"
              }`}
            >
              {String(item.id === "home" ? 0 : NAV_ITEMS.indexOf(item) + 1).padStart(2, "0")} / {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 items-center gap-3 sm:border-l sm:border-black/10 sm:pl-4 lg:justify-self-end">
        {userEmail && <span className="hidden max-w-48 truncate text-xs font-medium sm:inline">{userEmail}</span>}
        <form action={logout}>
          <button
            type="submit"
            className="font-jetbrains text-[11px] tracking-wider text-[#71717A] uppercase hover:text-black"
          >
            [Log ud]
          </button>
        </form>
      </div>
    </header>
  );
}
