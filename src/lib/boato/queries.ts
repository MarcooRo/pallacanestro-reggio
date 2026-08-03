// Letture del boato. Le righe sono già aggregate per costruzione: qui non
// c'è nulla da anonimizzare, perché non c'è nulla di personale.

import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { roarBuckets } from "@/src/db/schema";
import { BUCKET_MS, BUCKET_ONDA, type Bucket } from "@/src/lib/boato/regole";

export interface DatiBoato {
  /** Gli ultimi bucket, dal più vecchio al più recente */
  bucket: Bucket[];
  /** Il massimo della partita: è la scala dell'onda */
  picco: number;
  /** Tap totali della partita */
  totale: number;
}

export async function getBoato(
  matchId: string,
  adesso = new Date(),
): Promise<DatiBoato> {
  const da = new Date(adesso.getTime() - BUCKET_ONDA * BUCKET_MS);

  const [recenti, [riepilogo]] = await Promise.all([
    db
      .select({
        bucketStart: roarBuckets.bucketStart,
        taps: roarBuckets.taps,
        bursts: roarBuckets.bursts,
      })
      .from(roarBuckets)
      .where(and(eq(roarBuckets.matchId, matchId), gte(roarBuckets.bucketStart, da)))
      .orderBy(roarBuckets.bucketStart),
    db
      .select({
        picco: sql<number>`coalesce(max(${roarBuckets.taps}), 0)`,
        totale: sql<number>`coalesce(sum(${roarBuckets.taps}), 0)`,
      })
      .from(roarBuckets)
      .where(eq(roarBuckets.matchId, matchId)),
  ]);

  return {
    bucket: recenti.map((r) => ({
      bucketStart: r.bucketStart.toISOString(),
      taps: r.taps,
      bursts: r.bursts,
    })),
    picco: Number(riepilogo?.picco ?? 0),
    totale: Number(riepilogo?.totale ?? 0),
  };
}

/** Il momento più caldo della gara: serve al racconto post-partita. */
export async function getPiccoBoato(matchId: string) {
  const [riga] = await db
    .select({ bucketStart: roarBuckets.bucketStart, taps: roarBuckets.taps })
    .from(roarBuckets)
    .where(eq(roarBuckets.matchId, matchId))
    .orderBy(desc(roarBuckets.taps))
    .limit(1);
  return riga ?? null;
}
