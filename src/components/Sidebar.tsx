import Link from "next/link";
import { DocumentIcon, GearIcon, PaletteIcon, UsersIcon } from "./icons";
import { Logo } from "./Logo";
import { brand } from "@/config/brand";

export type SidebarPage = "products" | "settings" | "preview" | "customers" | "brand-settings";

interface NavItem {
  id: SidebarPage;
  label: string;
  href?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  { id: "products", label: "Vælg produkter", href: "/produkter", icon: Logo },
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
  active: SidebarPage;
}

export function Sidebar({ active }: SidebarProps) {
  // Sidebar er app-chrome, ikke nyhedsbrevets EGET indhold – viser derfor
  // bevidst app'ens statiske, faste navn/farve (brand.ts), IKKE kundens
  // dynamiske brand-indstillinger fra Indstillinger-siden (se
  // BrandSettingsContext.tsx). Navnet vises som to linjer (fx "Jysk" /
  // "Plantesalg").
  const [brandFirstWord, ...brandRestWords] = brand.name.split(" ");
  const brandRest = brandRestWords.join(" ");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border p-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
          <Logo className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold tracking-wide text-ink uppercase">{brandFirstWord}</span>
          <span className="text-[11px] text-ink-muted">{brandRest}</span>
        </div>
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
    </aside>
  );
}
