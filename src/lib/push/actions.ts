"use server";

// Gestione delle sottoscrizioni push dell'identità corrente.

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { pushSubscriptions } from "@/src/db/schema";
import {
  getProfilo,
  ottieniOCreaProfilo,
} from "@/src/lib/identita/sessione";

const schemaSottoscrizione = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

const schemaCategorie = z
  .array(z.enum(["vote_open", "vote_closing", "tally_published"]))
  .min(1);

export async function salvaSottoscrizione(
  sottoscrizione: unknown,
  categorie: string[],
): Promise<{ ok?: boolean; errore?: string }> {
  const profilo = await ottieniOCreaProfilo();
  if (!profilo) return { errore: "Troppe richieste da questa rete: riprova tra un minuto" };

  const sub = schemaSottoscrizione.safeParse(sottoscrizione);
  const cats = schemaCategorie.safeParse(categorie);
  if (!sub.success || !cats.success) return { errore: "Sottoscrizione non valida" };

  await db
    .insert(pushSubscriptions)
    .values({
      userId: profilo.id,
      endpoint: sub.data.endpoint,
      keys: sub.data.keys,
      categories: cats.data,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: profilo.id, keys: sub.data.keys, categories: cats.data },
    });

  return { ok: true };
}

export async function rimuoviSottoscrizione(endpoint: string): Promise<void> {
  const profilo = await getProfilo();
  if (!profilo) return;

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, profilo.id),
      ),
    );
}
