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
import { EditorialShell } from "@/components/EditorialShell";
import { SendIcon } from "@/components/icons";

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
    <EditorialShell>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 md:px-12">
        <div className="mx-auto w-full max-w-[760px] py-12">
          {/* Titel */}
          <header className="mb-12">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-forest" />
              <p className="text-xs font-semibold tracking-[0.2em] text-stone uppercase">Brugere / Adgang</p>
            </div>
            <h1 className="font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-[#1a1a1a] md:text-4xl md:leading-[1.25]">
              Inviter bruger
            </h1>
            <p className="mt-1 text-sm text-stone">Send en invitation via email til en ny bruger.</p>
            <div className="mt-4 h-px w-full bg-hairline" />
          </header>

          <form action={inviteUser} className="space-y-12">
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-garamond text-2xl leading-[1.35] font-medium text-stone/60 select-none">01</span>
                  <label htmlFor="email" className="text-xs font-semibold tracking-wider text-[#1a1a1a] uppercase">
                    Email <span className="align-middle text-red-700">*</span>
                  </label>
                </div>
                <span className="rounded-sm bg-track px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-stone">
                  Påkrævet
                </span>
              </div>
              <div className="rounded-sm border border-hairline bg-white p-4">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="F.eks. kollega@firma.dk"
                  className="h-12 w-full rounded-sm border border-hairline bg-white px-4 text-base text-[#1a1a1a] transition-colors placeholder:text-stone/60 focus:border-forest focus:outline-none"
                />
                <div className="mt-3 border-t border-hairline/60 pt-2 text-xs text-stone">
                  Personen modtager et link på mail og vælger selv sin adgangskode.
                </div>
              </div>
            </section>

            <div className="space-y-4 border-t border-hairline pt-8">
              {error && <p className="rounded-sm bg-rose-bg px-4 py-2 text-sm text-rose-ink">{error}</p>}
              {success && (
                <p className="rounded-sm bg-mint px-4 py-2 text-sm text-forest">Invitation sendt til {success}.</p>
              )}
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#36482e] px-8 text-xs font-semibold tracking-widest text-white uppercase shadow-sm transition-colors hover:bg-plant-hover active:translate-y-px sm:w-auto"
              >
                <SendIcon className="h-[18px] w-[18px]" />
                Send invitation
              </button>
            </div>
          </form>
        </div>
      </main>
    </EditorialShell>
  );
}
