"use client";

import Link from "next/link";
import { DocumentIcon, GearIcon, LogoutIcon, PaletteIcon, PlusIcon, UsersIcon } from "./icons";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import { logout } from "@/app/login/actions";

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

interface SidebarProps {
  // Valgfri – den nu nav-løse /produkter-side (se SidebarPage ovenfor)
  // rendrer Sidebar UDEN denne prop, så intet punkt fejlagtigt vises som
  // aktivt for en side, der ikke længere har et tilsvarende menupunkt.
  active?: SidebarPage;
  // Live-forhåndsvisning af firmanavnet, mens det skrives på Indstillinger-
  // siden (før det er gemt). Tom/udeladt = vis det gemte navn.
  previewName?: string;
}

export function Sidebar({ active, previewName }: SidebarProps) {
  // Resten af Sidebar (nav-ikoner, badge-BAGGRUNDSFARVE, "Udkast gemt" osv.)
  // er fortsat app-chrome og forbliver bevidst statisk – kun selve
  // identitets-visningen øverst (logo-billede + firmanavn) er en PRÆCIST
  // afgrænset undtagelse, der viser kundens rigtige brand-indstillinger, jf.
  // opgavebeskrivelsen. Navnet vises PRÆCIST som skrevet i Indstillinger,
  // ingen opsplitning/omformatering.
  const settings = useBrandSettings();
  // previewName er kun sat på Indstillinger-siden: dér afspejler hjørnet
  // feltet direkte, så et tomt felt viser placeholderen "Logo".
  const displayName = (previewName ?? settings.name).trim();

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
        <span
          className={`truncate text-xs font-semibold tracking-wide uppercase ${displayName ? "text-ink" : "text-ink-faintest"}`}
          title={displayName || "Logo"}
        >
          {displayName || "Logo"}
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
              <Link key={item.id} href={item.href} aria-current={isActive ? "page" : undefined} className={className}>
                <Icon className="h-3.75 w-3.75" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border px-3 py-3">
        <Link
          href="/inviter"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active hover:text-ink"
        >
          <PlusIcon className="h-3.75 w-3.75" />
          Inviter bruger
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink-muted hover:bg-surface-active hover:text-ink"
          >
            <LogoutIcon className="h-3.75 w-3.75" />
            Log ud
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop/tablet – uændret adfærd og udseende fra md og opefter,
          altid synlig. */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">{navBody}</aside>

      {/* Under md: INGEN hamburger-knap – kun en smal, synlig kant af
          sidemenuen langs venstre skærmkant (translate-x skjuler resten af
          panelet uden for skærmen). Hover (eller tastatur-fokus på et af
          nav-punkterne, via focus-within, til tastaturbrugere) lader HELE
          panelet glide ind fra venstre; flytter musen væk igen, glider det
          tilbage til kun den smalle kant – ingen klik/JS-state involveret. */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-64 max-w-[80vw] -translate-x-[calc(100%-10px)] flex-col border-r border-border bg-surface shadow-[0_0_24px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out hover:translate-x-0 focus-within:translate-x-0 md:hidden"
      >
        {navBody}
      </aside>
    </>
  );
}
