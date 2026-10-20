// src/app/invite/set-password/page.tsx
//
// Siden, hvor en inviteret bruger vælger sin adgangskode. Server Component,
// så firmanavn/logo hentes direkte fra settings-tabellen (siden er offentlig
// – den beskyttede /api/settings kan ikke bruges uden login). Al token-
// verificering og selve gemningen sker i SetPasswordForm (klient).

import { getBrandSettings } from "@/lib/brandSettings";
import { SetPasswordForm } from "./SetPasswordForm";
import { AuthShell } from "@/components/AuthShell";

export default async function SetPasswordPage() {
  const settings = await getBrandSettings();
  const companyName = settings.company_name.trim();

  return (
    <AuthShell
      companyName={companyName}
      logoData={settings.logo_data}
      eyebrow="Invitation / Adgang"
      title="Sæt adgangskode"
      subtitle="Vælg en adgangskode for at fuldføre din konto."
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
