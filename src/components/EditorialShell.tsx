"use client";

// Ramme fra Stitch-redesignet ("Jysk Plantesalg Nyhedsbrevgenerator"): lys
// baggrund, topbar med firmanavn i EB Garamond, navigation i DM Sans med
// streg under den aktive side, log ud + avatar til højre, og en
// footer med "Inviter bruger".

import type { ReactNode } from "react";
import Link from "next/link";
import { HOME_ITEM, NAV_ITEMS, type NavPage } from "@/components/navItems";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import { logout } from "@/app/login/actions";
import { PlusIcon, UserIcon } from "@/components/icons";

// previewName: live-forhåndsvisning af firmanavnet, mens det skrives på
// Indstillinger-siden (før gem).
export function EditorialShell({
  active,
  previewName,
  children,
}: {
  active?: NavPage;
  previewName?: string;
  children: ReactNode;
}) {
  const settings = useBrandSettings();
  const companyName = (previewName ?? settings.name).trim();

  return (
    <div className="flex min-h-screen w-full flex-col bg-plant-bg font-sans text-ink-deep antialiased">
      <header className="sticky top-0 z-50 w-full border-b border-forest bg-plant-bg">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 md:px-12">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {/* Kun et UPLOADET logo vises – uden logo står firmanavnet alene. */}
            {settings.logoData && (
              // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
              <img src={settings.logoData} alt="" className="h-7 w-7 shrink-0 object-contain" />
            )}
            <span
              className={`truncate font-garamond text-2xl leading-[1.35] font-medium tracking-tight text-forest ${
                companyName ? "" : "opacity-30"
              }`}
            >
              {companyName || "Logo"}
            </span>
          </Link>

          <nav className="hidden h-full items-center gap-8 md:flex">
            {[HOME_ITEM, ...NAV_ITEMS].map((item) => {
              const isActive = item.id === active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-full items-center border-b transition-colors ${
                    isActive
                      ? "border-forest text-base font-medium text-forest"
                      : "border-transparent text-sm text-stone-dark hover:text-forest"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-stone underline decoration-hairline underline-offset-4 transition-colors hover:text-forest"
              >
                Log ud
              </button>
            </form>
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-white">
              <UserIcon className="h-[18px] w-[18px]" />
            </span>
          </div>
        </div>

        {/* Smal skærm: navigationen på sin egen linje. */}
        <nav className="flex gap-5 overflow-x-auto border-t border-hairline px-5 py-2 text-sm md:hidden">
          {[HOME_ITEM, ...NAV_ITEMS].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === active ? "page" : undefined}
              className={`whitespace-nowrap ${item.id === active ? "font-medium text-forest" : "text-stone-dark"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}

      <footer className="w-full border-t border-hairline">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-end px-5 md:px-12">
          <Link
            href="/inviter"
            className="inline-flex items-center gap-1 text-sm font-medium text-forest transition-colors hover:text-forest-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Inviter bruger
          </Link>
        </div>
      </footer>
    </div>
  );
}
