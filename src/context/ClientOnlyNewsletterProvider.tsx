"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// NewsletterProvider læser localStorage synkront ved mount (se
// NewsletterContext.tsx) for at kunne genindlæse et gemt udkast, FØR noget
// andet renderes – uden et synligt "flash" af tom state. Al indhold, der
// bruger context'en, er allerede "use client"-sider uden nogen
// server-dataafhængighed (produkter/opsætning/preview/kunder), så der er
// intet at vinde ved at server-rendre denne del af træet – kun risiko for en
// hydration-mismatch, når klientens allerførste render (med det rigtige,
// localStorage-baserede udkast) ikke matcher serverens (som aldrig har adgang
// til localStorage). `ssr: false` fjerner problemet ved roden: provideren
// (og alt indeni den) rendres kun på klienten, så der er intet
// server-rendret output at være uenig med.
const NewsletterProvider = dynamic(
  () => import("./NewsletterContext").then((mod) => mod.NewsletterProvider),
  { ssr: false },
);

export function ClientOnlyNewsletterProvider({ children }: { children: ReactNode }) {
  return <NewsletterProvider>{children}</NewsletterProvider>;
}
