// Letture dei pronostici. Esce la distribuzione AGGREGATA delle risposte e
// la risposta di chi sta guardando: chi ha risposto cosa non è mai un elenco.

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { pointsLedger, predictionAnswers, predictions } from "@/src/db/schema";
import {
  leggiOpzioni,
  leggiScelta,
  type PronosticoPubblico,
} from "@/src/lib/pronostici/regole";

export async function getPronosticiPartita(
  matchId: string,
  userId: string | null,
): Promise<PronosticoPubblico[]> {
  const righe = await db
    .select({
      id: predictions.id,
      question: predictions.question,
      options: predictions.options,
      status: predictions.status,
      closesAt: predictions.closesAt,
      correctAnswer: predictions.correctAnswer,
    })
    .from(predictions)
    .where(eq(predictions.matchId, matchId))
    .orderBy(predictions.closesAt);

  if (righe.length === 0) return [];
  const ids = righe.map((r) => r.id);

  // Un solo group by per tutte le domande della partita.
  const opzioneScelta = sql<number>`(${predictionAnswers.answer}->>'opzione')::int`;
  const conteggi = await db
    .select({
      predictionId: predictionAnswers.predictionId,
      opzione: opzioneScelta,
      quante: count(),
    })
    .from(predictionAnswers)
    .where(inArray(predictionAnswers.predictionId, ids))
    .groupBy(predictionAnswers.predictionId, opzioneScelta);

  const mie = userId
    ? await db
        .select({
          predictionId: predictionAnswers.predictionId,
          answer: predictionAnswers.answer,
        })
        .from(predictionAnswers)
        .where(
          and(
            inArray(predictionAnswers.predictionId, ids),
            eq(predictionAnswers.userId, userId),
          ),
        )
    : [];
  const miePerId = new Map(mie.map((r) => [r.predictionId, leggiScelta(r.answer)]));

  return righe.map((r) => {
    const opzioni = leggiOpzioni(r.options);
    const distribuzione = new Array(opzioni.length).fill(0) as number[];
    let totale = 0;
    for (const c of conteggi) {
      if (c.predictionId !== r.id) continue;
      const indice = Number(c.opzione);
      const quante = Number(c.quante);
      totale += quante;
      // Una risposta fuori range non si perde in silenzio nel totale, ma
      // non ha una barra da riempire.
      if (indice >= 0 && indice < distribuzione.length) {
        distribuzione[indice] = quante;
      }
    }
    const mia = miePerId.get(r.id) ?? null;
    // Chi non ha ancora risposto non deve nemmeno RICEVERE la distribuzione:
    // nasconderla solo nell'interfaccia la lascerebbe leggibile nel payload,
    // e vedere le percentuali prima di scegliere sposta la risposta.
    const visibile = mia !== null || r.status !== "open";
    return {
      id: r.id,
      question: r.question,
      opzioni,
      status: r.status,
      closesAt: r.closesAt,
      corretta: leggiScelta(r.correctAnswer),
      mia,
      distribuzione: visibile ? distribuzione : distribuzione.map(() => 0),
      // Quante hanno risposto si può dire sempre: è un incoraggiamento, non
      // un'indicazione su cosa scegliere.
      totale,
    };
  });
}

/** I punti dell'utente: dato personale, si legge solo nel proprio profilo. */
export async function getPuntiUtente(userId: string): Promise<number> {
  const [riga] = await db
    .select({ punti: sql<number>`coalesce(sum(${pointsLedger.points}), 0)` })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));
  return Number(riga?.punti ?? 0);
}

export interface PronosticoAdmin {
  id: string;
  question: string;
  opzioni: string[];
  status: string;
  closesAt: Date;
  corretta: number | null;
  risposte: number;
}

/**
 * Per il pannello admin: le domande delle partite in elenco, con quante
 * risposte hanno. Una query per tutte le partite, non una per riga.
 */
export async function getPronosticiAdmin(
  matchIds: readonly string[],
): Promise<Map<string, PronosticoAdmin[]>> {
  const gruppi = new Map<string, PronosticoAdmin[]>();
  if (matchIds.length === 0) return gruppi;

  const righe = await db
    .select({
      id: predictions.id,
      matchId: predictions.matchId,
      question: predictions.question,
      options: predictions.options,
      status: predictions.status,
      closesAt: predictions.closesAt,
      correctAnswer: predictions.correctAnswer,
      risposte: sql<number>`(
        select count(*) from prediction_answers pa
        where pa.prediction_id = ${predictions.id}
      )`,
    })
    .from(predictions)
    .where(inArray(predictions.matchId, [...matchIds]))
    .orderBy(desc(predictions.closesAt));

  for (const r of righe) {
    const elenco = gruppi.get(r.matchId) ?? [];
    elenco.push({
      id: r.id,
      question: r.question,
      opzioni: leggiOpzioni(r.options),
      status: r.status,
      closesAt: r.closesAt,
      corretta: leggiScelta(r.correctAnswer),
      risposte: Number(r.risposte),
    });
    gruppi.set(r.matchId, elenco);
  }
  return gruppi;
}
