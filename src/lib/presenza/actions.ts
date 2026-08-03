"use server";

// L'unico punto di scrittura di attendances. È una dichiarazione, non una
// presenza verificata: nessun biglietto, nessun tornello — quindi il numero
// va letto come "intenzione della curva", ed è per questo che resta un
// aggregato senza nomi.

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { attendances } from "@/src/db/schema";
import { getProfilo } from "@/src/lib/auth/session";
import { getFlag } from "@/src/lib/flag";
import { getStatoPresenza, type StatoPresenza } from "@/src/lib/presenza/queries";

export interface EsitoPresenza {
  errore?: string;
  stato?: StatoPresenza;
}

export async function dichiaraPresenza(matchId: string): Promise<EsitoPresenza> {
  const flag = await getFlag();
  if (!flag.ioCiSono) return { errore: "Funzionalità non attiva" };

  const profilo = await getProfilo();
  if (!profilo) return { errore: "Accedi per dire che ci sei" };

  const parsed = z.string().uuid().safeParse(matchId);
  if (!parsed.success) return { errore: "Partita non valida" };

  const partita = await db.query.matches.findFirst({
    columns: { id: true, status: true, startsAt: true },
    where: (m, { eq }) => eq(m.id, parsed.data),
  });
  if (!partita) return { errore: "Partita non trovata" };
  // Dopo la palla a due la domanda non ha più senso.
  if (partita.status !== "scheduled" || partita.startsAt <= new Date()) {
    return { errore: "La partita è già iniziata" };
  }

  const dove = and(
    eq(attendances.matchId, parsed.data),
    eq(attendances.userId, profilo.id),
  );
  const [esistente] = await db
    .select({ userId: attendances.userId })
    .from(attendances)
    .where(dove)
    .limit(1);

  if (esistente) {
    await db.delete(attendances).where(dove);
  } else {
    await db
      .insert(attendances)
      .values({ matchId: parsed.data, userId: profilo.id })
      .onConflictDoNothing();
  }

  return { stato: await getStatoPresenza(parsed.data, profilo.id) };
}
