"use server";
// src/app/inviter/actions.ts
//
// inviteUser() kalder Supabases indbyggede invite-funktion server-side, via
// SERVICE_ROLE_KEY (getSupabaseClient() i src/lib/supabase.ts – ALDRIG
// eksponeret til klienten, kun importeret her, serverside). Ingen åben
// signup findes noget sted i appen – dette er den ENESTE vej til at oprette
// en ny bruger, og kræver selv en gyldig session for at kunne kaldes (egen,
// uafhængig getUser()-tjek herunder, samme princip som hver API-route – se
// requireUser() i src/lib/supabase/requireUser.ts – oveni at selve
// /inviter-siden allerede er beskyttet af middleware).

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function inviteUser(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/inviter?error=${encodeURIComponent("Email er påkrævet")}`);
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const adminClient = getSupabaseClient();
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/invite/set-password`,
  });

  if (error) {
    redirect(`/inviter?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/inviter?success=${encodeURIComponent(email)}`);
}
