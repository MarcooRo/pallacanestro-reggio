"use server";

// La risposta al pronostico: un solo punto di scrittura di
// prediction_answers. Una risposta per utente per domanda, non modificabile
// — come il voto, perché qui si sta scommettendo qualcosa.

import { z } from "zod";

import { db } from "@/src/db";
import { predictionAnswers } from "@/src/db/schema";
import { ottieniOCreaProfilo } from "@/src/lib/identita/sessione";
import { getFlag } from "@/src/lib/flag";
import { getPronosticiPartita } from "@/src/lib/pronostici/queries";
import {
  leggiOpzioni,
  pronosticoAperto,
  scelta,
  type PronosticoPubblico,
} from "@/src/lib/pronostici/regole";

export interface EsitoPronostico {
  errore?: string;
  /** Le domande aggiornate della partita: il client non ricalcola nulla */
  pronostici?: PronosticoPubblico[];
}

export async function rispondi(
  predictionId: string,
  opzione: number,
): Promise<EsitoPronostico> {
  const flag = await getFlag();
  if (!flag.pronostici) return { errore: "I pronostici non sono attivi" };

  const profilo = await ottieniOCreaProfilo();
  if (!profilo) return { errore: "Troppe richieste da questa rete: riprova tra un minuto" };

  const parsed = z
    .object({ predictionId: z.string().uuid(), opzione: z.number().int().min(0) })
    .safeParse({ predictionId, opzione });
  if (!parsed.success) return { errore: "Risposta non valida" };

  const pronostico = await db.query.predictions.findFirst({
    columns: {
      id: true,
      matchId: true,
      status: true,
      closesAt: true,
      options: true,
    },
    where: (p, { eq }) => eq(p.id, parsed.data.predictionId),
  });
  if (!pronostico) return { errore: "Pronostico non trovato" };

  // La finestra si applica QUI, non nel client.
  if (!pronosticoAperto(pronostico, new Date())) {
    return { errore: "Questo pronostico è chiuso" };
  }

  const opzioni = leggiOpzioni(pronostico.options);
  if (parsed.data.opzione >= opzioni.length) {
    return { errore: "Risposta non prevista" };
  }

  try {
    await db.insert(predictionAnswers).values({
      predictionId: pronostico.id,
      userId: profilo.id,
      answer: scelta(parsed.data.opzione),
    });
  } catch (err) {
    // 23505 = unique (prediction_id, user_id): una risposta per utente.
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return { errore: "Hai già risposto a questa domanda" };
    }
    throw err;
  }

  return {
    pronostici: await getPronosticiPartita(pronostico.matchId, profilo.id),
  };
}
