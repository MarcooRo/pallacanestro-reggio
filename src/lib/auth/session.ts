// Lettura di utente e profilo correnti, lato server.

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function getUtente() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfilo() {
  const user = await getUtente();
  if (!user) return null;

  const [profilo] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return profilo ?? null;
}
