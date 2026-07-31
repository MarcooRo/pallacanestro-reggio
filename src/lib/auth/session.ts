// Lettura di utente e profilo correnti, lato server.
// cache() deduplica dentro la stessa richiesta: getUser() valida la
// sessione via rete (Supabase è in eu-west-1) e senza cache ogni
// componente che chiede il profilo pagherebbe un round trip in più.

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export const getUtente = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfilo = cache(async () => {
  const user = await getUtente();
  if (!user) return null;

  const [profilo] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return profilo ?? null;
});
