"use server";

// L'unico punto di scrittura di match_reactions. A differenza del voto la
// reazione è modificabile: ritoccarla è un gesto, non un verdetto — tap sulla
// stessa la toglie, tap su un'altra la sposta.

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { matchReactions } from "@/src/db/schema";
import { ottieniOCreaProfilo } from "@/src/lib/identita/sessione";
import { getFlag } from "@/src/lib/flag";
import { getStatoReazioni, type StatoReazioni } from "@/src/lib/reazioni/queries";
import { reazioneValida } from "@/src/lib/reazioni/tipi";

const schema = z.object({
  matchId: z.string().uuid(),
  kind: z.string().refine(reazioneValida, "reazione non prevista"),
});

export interface EsitoReazione {
  errore?: string;
  /** Lo stato aggiornato: il client non ricalcola nulla da sé */
  stato?: StatoReazioni;
}

export async function reagisci(
  matchId: string,
  kind: string,
): Promise<EsitoReazione> {
  // Lo stesso interruttore che nasconde il componente vale anche qui:
  // l'UI non è il posto dove si fanno rispettare le regole.
  const flag = await getFlag();
  if (!flag.reazioni) return { errore: "Le reazioni non sono attive" };

  const profilo = await ottieniOCreaProfilo();
  if (!profilo) return { errore: "Troppe richieste da questa rete: riprova tra un minuto" };

  const parsed = schema.safeParse({ matchId, kind });
  if (!parsed.success) return { errore: "Reazione non valida" };

  const partita = await db.query.matches.findFirst({
    columns: { id: true, status: true },
    where: (m, { eq }) => eq(m.id, parsed.data.matchId),
  });
  if (!partita) return { errore: "Partita non trovata" };
  // Si reagisce al risultato: prima che ci sia un risultato non c'è nulla
  // a cui reagire.
  if (partita.status !== "finished") {
    return { errore: "La partita non è ancora finita" };
  }

  const dove = and(
    eq(matchReactions.matchId, parsed.data.matchId),
    eq(matchReactions.userId, profilo.id),
  );
  const [esistente] = await db
    .select({ kind: matchReactions.kind })
    .from(matchReactions)
    .where(dove)
    .limit(1);

  if (esistente?.kind === parsed.data.kind) {
    await db.delete(matchReactions).where(dove);
  } else {
    await db
      .insert(matchReactions)
      .values({
        matchId: parsed.data.matchId,
        userId: profilo.id,
        kind: parsed.data.kind,
      })
      .onConflictDoUpdate({
        target: [matchReactions.matchId, matchReactions.userId],
        set: { kind: parsed.data.kind, updatedAt: new Date() },
      });
  }

  // Niente revalidatePath: il componente è client e si aggiorna con lo
  // stato che gli restituiamo. Ricaricando la pagina si rilegge dal DB.
  return { stato: await getStatoReazioni(parsed.data.matchId, profilo.id) };
}
