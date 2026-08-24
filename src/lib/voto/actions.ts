"use server";

// La server action del voto: l'UNICO punto di scrittura di votes.
// Qui vivono la finestra, i votabili e le regole; il client le mostra
// soltanto. Non esiste alcuna action di modifica: il voto è immutabile.

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/src/db";
import { pointsLedger, votes } from "@/src/db/schema";
import { ottieniOCreaProfilo } from "@/src/lib/identita/sessione";
import {
  finestraAperta,
  PUNTI_VOTO_ESPRESSO,
  validaScelte,
} from "@/src/lib/voto/regole";

const uuid = z.string().uuid();
const uuidFacoltativo = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .pipe(uuid.nullable());

const schemaVoto = z.object({
  matchId: uuid,
  bestPlayerId: uuid,
  optionalAId: uuidFacoltativo,
  optionalBId: uuidFacoltativo,
  favoritePlayerId: uuidFacoltativo,
});

export interface StatoVoto {
  ok?: boolean;
  errore?: string;
}

export async function esprimiVoto(
  _prev: StatoVoto,
  formData: FormData,
): Promise<StatoVoto> {
  const profilo = await ottieniOCreaProfilo();
  if (!profilo) return { errore: "Troppe richieste da questa rete: riprova tra un minuto" };

  const parsed = schemaVoto.safeParse({
    matchId: formData.get("matchId"),
    bestPlayerId: formData.get("bestPlayerId"),
    optionalAId: formData.get("optionalAId") ?? "",
    optionalBId: formData.get("optionalBId") ?? "",
    favoritePlayerId: formData.get("favoritePlayerId") ?? "",
  });
  if (!parsed.success) return { errore: "Scelte non valide" };
  const scelte = parsed.data;

  const partita = await db.query.matches.findFirst({
    columns: { id: true, votingState: true, votingClosesAt: true },
    where: (m, { eq }) => eq(m.id, scelte.matchId),
  });
  if (!partita) return { errore: "Partita non trovata" };

  // La finestra si applica QUI, non nel client.
  if (!finestraAperta(partita, new Date())) {
    return { errore: "La votazione per questa partita non è aperta" };
  }

  const righeVotabili = await db.execute<{ player_id: string }>(
    sql`select player_id from eligible_voters(${scelte.matchId})`,
  );
  const votabili = new Set(righeVotabili.map((r) => r.player_id));

  const errore = validaScelte(scelte, votabili);
  if (errore) return { errore };

  try {
    await db.transaction(async (tx) => {
      const [voto] = await tx
        .insert(votes)
        .values({
          matchId: scelte.matchId,
          userId: profilo.id,
          bestPlayerId: scelte.bestPlayerId,
          optionalAId: scelte.optionalAId,
          optionalBId: scelte.optionalBId,
          favoritePlayerId: scelte.favoritePlayerId,
        })
        .returning({ id: votes.id });

      await tx.insert(pointsLedger).values({
        userId: profilo.id,
        reason: "vote_cast",
        refId: voto.id,
        points: PUNTI_VOTO_ESPRESSO,
      });
    });
  } catch (err) {
    // 23505 = vincolo unique (match_id, user_id): un voto per utente per partita
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return { errore: "Hai già votato per questa partita" };
    }
    // Anche il DB fa rispettare le regole (check constraint): qualsiasi
    // violazione arrivata fin qui è un bug, non un input dell'utente.
    throw err;
  }

  revalidatePath(`/partite/${scelte.matchId}`);
  return { ok: true };
}
