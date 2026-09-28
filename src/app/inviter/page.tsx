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
import { SectionLabel, StitchShell } from "@/components/StitchShell";

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
    <StitchShell>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Titel */}
        <section className="border-b border-black/10 bg-white/40 px-4 py-7 sm:px-8">
          <div className="mb-1.5 font-jetbrains text-[10px] tracking-widest text-[#71717A] uppercase">
            Brugere <span className="text-black/30">/</span> Adgang
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] uppercase sm:text-4xl">Inviter bruger</h1>
          <p className="mt-1.5 text-sm text-[#555555]">Send en invitation via email til en ny bruger</p>
        </section>

        {/* Formularen centreret på skærmen */}
        <main className="flex flex-1 items-center justify-center bg-[#f8f9fa] px-4 py-12 sm:px-8">
          <form
            action={inviteUser}
            className="flex w-full max-w-md flex-col gap-5 rounded-sm border border-black/15 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:p-8"
          >
            <SectionLabel>Ny invitation</SectionLabel>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="font-jetbrains text-[11px] text-[#666666] uppercase">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="F.eks. kollega@firma.dk"
                className="w-full rounded-xs border border-[#cfcfcf] bg-[#fdfdfd] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-neutral-400 transition-colors focus:border-black focus:bg-white focus:outline-none"
              />
              <p className="text-xs text-[#777777]">
                Personen modtager et link på mail og vælger selv sin adgangskode.
              </p>
            </div>

            {error && (
              <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 font-jetbrains text-xs text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="border-l-2 border-black bg-[#f5f5f5] px-3 py-2 font-jetbrains text-xs text-black">
                Invitation sendt til {success}.
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-black px-7 py-3 font-jetbrains text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-[#222222] active:scale-[0.99]"
            >
              Send invitation
            </button>
          </form>
        </main>
      </div>
    </StitchShell>
  );
}
