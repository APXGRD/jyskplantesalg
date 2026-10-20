// src/app/afmeld/page.tsx
//
// Den OFFENTLIGE, generiske afmeldingsside – FAST link i footeren på ALLE
// nyhedsbreve (samme URL uanset modtager, se getUnsubscribeUrl), da
// "Kopiér nyhedsbrev"-arbejdsgangen ikke sender individuelle emails med et
// personligt afmeldings-token pr. modtager. Brugeren indtaster derfor selv
// sin email – ingen forudfyldt data. Bevidst UNDTAGET fra middleware'ens
// login-krav (se isPublicAuthRoute i src/lib/supabase/middleware.ts) og
// kalder en TILSVARENDE offentlig, login-fri API-route
// (api/customers/unsubscribe-by-email), da en rigtig nyhedsbrevsmodtager
// aldrig er logget ind i selve appen.
//
// Server Component, så firmanavn/logo hentes direkte fra settings-tabellen –
// den beskyttede /api/settings kan ikke bruges her uden login.

import { getBrandSettings } from "@/lib/brandSettings";
import { AfmeldForm } from "./AfmeldForm";
import { AuthShell } from "@/components/AuthShell";

export default async function AfmeldPage() {
  const settings = await getBrandSettings();
  const companyName = settings.company_name.trim();

  return (
    <AuthShell
      companyName={companyName}
      logoData={settings.logo_data}
      eyebrow="Nyhedsbrev / Afmelding"
      title="Afmeld nyhedsbrev"
      subtitle="Indtast din email for at afmelde dig nyhedsbrevet."
    >
      <AfmeldForm />
    </AuthShell>
  );
}
