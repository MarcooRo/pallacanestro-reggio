// Letture delle reazioni. Escono solo aggregati, più la reazione di CHI
// sta guardando (che è un dato suo, non di terzi).

import { and, count, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { matchReactions } from "@/src/db/schema";
import type { ConteggiReazioni } from "@/src/lib/reazioni/tipi";

export interface StatoReazioni {
  conteggi: ConteggiReazioni;
  /** La reazione dell'utente corrente, null se non ha reagito o non è loggato */
  mia: string | null;
  totale: number;
}

export async function getConteggiReazioni(
  matchId: string,
): Promise<ConteggiReazioni> {
  const righe = await db
    .select({ kind: matchReactions.kind, quante: count() })
    .from(matchReactions)
    .where(eq(matchReactions.matchId, matchId))
    .groupBy(matchReactions.kind);

  return Object.fromEntries(righe.map((r) => [r.kind, Number(r.quante)]));
}

export async function getMiaReazione(
  matchId: string,
  userId: string,
): Promise<string | null> {
  const [riga] = await db
    .select({ kind: matchReactions.kind })
    .from(matchReactions)
    .where(
      and(eq(matchReactions.matchId, matchId), eq(matchReactions.userId, userId)),
    )
    .limit(1);
  return riga?.kind ?? null;
}

export async function getStatoReazioni(
  matchId: string,
  userId: string | null,
): Promise<StatoReazioni> {
  const [conteggi, mia] = await Promise.all([
    getConteggiReazioni(matchId),
    userId ? getMiaReazione(matchId, userId) : null,
  ]);
  const totale = Object.values(conteggi).reduce((a, b) => a + b, 0);
  return { conteggi, mia, totale };
}
