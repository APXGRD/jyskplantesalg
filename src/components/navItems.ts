// Navigationens sider – bruges af EditorialShell (topbar + mobilmenu).

export type NavPage = "home" | "settings" | "preview" | "customers" | "brand-settings";

// "Forside" står altid først i navigationen.
export const HOME_ITEM: { id: NavPage; label: string; href: string } = { id: "home", label: "Forside", href: "/" };

export const NAV_ITEMS: { id: NavPage; label: string; href: string }[] = [
  { id: "settings", label: "Opsætning", href: "/opsaetning" },
  { id: "preview", label: "Preview & Rediger", href: "/preview" },
  { id: "customers", label: "Kunder", href: "/kunder" },
  { id: "brand-settings", label: "Indstillinger", href: "/indstillinger" },
];
