// src/app/inviter/page.tsx
//
// "Inviter bruger"-siden – ENESTE vej til at oprette en ny bruger i appen,
// ingen åben signup findes noget sted. Beskyttet af middleware.ts som
// enhver anden side (omdirigerer til /login uden gyldig session) – men
// tjekker HERUDOVER selv eksplicit for en gyldig bruger (getUser(), samme
// princip som hver API-route, se requireUser()) og omdirigerer selv til
// /login, hvis ingen findes – så siden beviseligt kræver login for at
// tilgås, uafhængigt af middleware'et.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteUser } from "./actions";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";

export default async function InviterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error, success } = await searchParams;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <PageHeader title="Inviter bruger" subtitle="Send en invitation via email til en ny bruger" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <form
            action={inviteUser}
            className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-background p-6"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-ink-muted">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Invitation sendt til {success}.</p>
            )}

            <button
              type="submit"
              className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Send invitation
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
