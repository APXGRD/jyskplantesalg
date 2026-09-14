"use client";

import { useState } from "react";
import Link from "next/link";
import { DocumentIcon, GearIcon, MenuIcon, PaletteIcon, UsersIcon, XIcon } from "./icons";
import { useBrandSettings } from "@/context/BrandSettingsContext";

// "products" (den tidligere "Vælg produkter"-side) er BEVIDST ikke længere
// en mulig værdi her – siden er fjernet fra navigationen/det normale flow
// (nyhedsbreve genereres nu udelukkende via Opsætnings-sidens samlede
// beskrivelsesfelt), men selve /produkter-routen og dens indhold
// (søgning/filtrering/synkroniser-knappen) eksisterer stadig uændret, kun
// uden et link hertil i denne sidemenu.
export type SidebarPage = "settings" | "preview" | "customers" | "brand-settings";

interface NavItem {
  id: SidebarPage;
  label: string;
  href?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  { id: "settings", label: "Opsætning", href: "/opsaetning", icon: GearIcon },
  { id: "preview", label: "Preview / Rediger", href: "/preview", icon: DocumentIcon },
  { id: "customers", label: "Kunder", href: "/kunder", icon: UsersIcon },
  { id: "brand-settings", label: "Indstillinger", href: "/indstillinger", icon: PaletteIcon },
];

function formatDraftSavedAt(date: Date) {
  const datePart = new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} · ${timePart}`;
}

interface SidebarProps {
  // Valgfri – den nu nav-løse /produkter-side (se SidebarPage ovenfor)
  // rendrer Sidebar UDEN denne prop, så intet punkt fejlagtigt vises som
  // aktivt for en side, der ikke længere har et tilsvarende menupunkt.
  active?: SidebarPage;
}

export function Sidebar({ active }: SidebarProps) {
  // Resten af Sidebar (nav-ikoner, badge-BAGGRUNDSFARVE, "Udkast gemt" osv.)
  // er fortsat app-chrome og forbliver bevidst statisk – kun selve
  // identitets-visningen øverst (logo-billede + firmanavn) er en PRÆCIST
  // afgrænset undtagelse, der viser kundens rigtige brand-indstillinger, jf.
  // opgavebeskrivelsen. Navnet vises PRÆCIST som skrevet i Indstillinger,
  // ingen opsplitning/omformatering.
  const settings = useBrandSettings();
  // Kun relevant under md-breakpointet (se den faste hamburger-knap
  // herunder) – ved md og opefter er sidemenuen altid synlig, uændret fra
  // før dette responsive-arbejde, og denne state bruges slet ikke.
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navBody = (
    <>
      <div className="flex items-center gap-3 border-b border-border p-5">
        {settings.logoData && (
          // Intet farvet cirkel-badge her – et rigtigt, uploadet logo har
          // typisk sin egen baggrund/form og skal vises rent, uden en
          // ekstra ring/baggrund uden om. Uden et uploadet logo vises INTET
          // ikon her (kun firmanavnet) – samme princip som nyhedsbrevets
          // egen header (NewsletterCard.tsx), i stedet for det tidligere
          // faste leaf-ikon som fallback.
          // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
          <img src={settings.logoData} alt="" className="h-8 w-8 shrink-0 object-contain" />
        )}
        <span className="truncate text-xs font-semibold tracking-wide text-ink uppercase" title={settings.name}>
          {settings.name}
        </span>
      </div>

      <div className="flex-1 px-3 py-4">
        <p className="px-2 pb-3 text-[9px] font-semibold tracking-wider text-ink-faintest uppercase">
          Nyhedsbrev
        </p>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active;
            const Icon = item.icon;
            const className = `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium ${
              isActive ? "bg-surface-active text-ink" : "text-ink-muted"
            }`;

            if (!item.href) {
              return (
                <div key={item.id} className={className}>
                  <Icon className="h-3.75 w-3.75" />
                  {item.label}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                // Lukker altid den mobile menu efter et sidevalg – harmløs
                // no-op ved md+ (isMobileOpen bruges der slet ikke).
                onClick={() => setIsMobileOpen(false)}
                className={className}
              >
                <Icon className="h-3.75 w-3.75" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] text-ink-faint">Udkast gemt</p>
        <p className="pt-0.5 text-[11px] font-medium text-ink-muted">{formatDraftSavedAt(new Date())}</p>
      </div>
    </>
  );

  return (
    <>
      {/* Fast hamburger-knap – KUN under md-breakpointet, hvor selve
          sidemenuen er skjult som standard (se aside herunder). Fixed
          positionering betyder, den er synlig oven på al sideindhold på
          alle fem sider, uden at hver enkelt side selv skal håndtere den. */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Åbn menu"
        className="fixed top-4 left-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted shadow-[0_1px_3px_rgba(0,0,0,0.1)] md:hidden"
      >
        <MenuIcon className="h-4 w-4" />
      </button>

      {/* Desktop/tablet – uændret adfærd og udseende fra md og opefter,
          altid synlig, ingen state involveret. */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {navBody}
      </aside>

      {/* Mobil – off-canvas menu, kun i DOM'en når den rent faktisk er
          åben. Samme baggrunds-luk-mønster som ConfirmDialog.tsx. */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label="Luk menu"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <aside className="relative flex h-full w-64 max-w-[80vw] flex-col border-r border-border bg-surface shadow-[0_0_24px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Luk menu"
              className="absolute top-4 right-3 flex h-7 w-7 items-center justify-center rounded-md text-ink-faintest hover:bg-surface-active hover:text-ink-muted"
            >
              <XIcon className="h-4 w-4" />
            </button>
            {navBody}
          </aside>
        </div>
      )}
    </>
  );
}
