"use server";

// L'unico punto di scrittura di roar_buckets. La scrittura passa da una
// server action (convenzione del progetto: il client non parla al database);
// la LETTURA invece è una rotta cacheata sulla CDN, perché lì il costo
// cresce col numero di spettatori — vedi app/api/boato/[matchId]/route.ts.

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { roarBuckets } from "@/src/db/schema";
import { getProfilo } from "@/src/lib/auth/session";
import {
  finestraBoatoAperta,
  inizioBucket,
  tapAmmessi,
} from "@/src/lib/boato/regole";
import { getFlag } from "@/src/lib/flag";

export interface EsitoBoato {
  ok?: boolean;
  errore?: string;
  /** Quando la finestra è chiusa il client smette di provarci */
  chiuso?: boolean;
}

export async function mandaTap(
  matchId: string,
  taps: number,
): Promise<EsitoBoato> {
  const flag = await getFlag();
  if (!flag.boato) return { errore: "Il boato non è attivo", chiuso: true };

  const profilo = await getProfilo();
  if (!profilo) return { errore: "Accedi per far sentire la tua voce" };

  const parsed = z.string().uuid().safeParse(matchId);
  if (!parsed.success) return { errore: "Partita non valida", chiuso: true };

  // Il tetto si applica QUI: quanti tap dice il client non è un dato fidato.
  const quanti = tapAmmessi(taps);
  if (quanti === 0) return { ok: true };

  const partita = await db.query.matches.findFirst({
    columns: { id: true, status: true, startsAt: true },
    where: (m, { eq }) => eq(m.id, parsed.data),
  });
  if (!partita) return { errore: "Partita non trovata", chiuso: true };

  const adesso = new Date();
  if (!finestraBoatoAperta(partita, adesso)) {
    return { errore: "Il boato è chiuso", chiuso: true };
  }

  // L'istante lo decide il server: un client con l'orologio sbagliato non
  // deve poter scrivere nel futuro o nel passato della curva.
  await db
    .insert(roarBuckets)
    .values({
      matchId: parsed.data,
      bucketStart: inizioBucket(adesso),
      taps: quanti,
      bursts: 1,
    })
    .onConflictDoUpdate({
      target: [roarBuckets.matchId, roarBuckets.bucketStart],
      set: {
        taps: sql`${roarBuckets.taps} + ${quanti}`,
        bursts: sql`${roarBuckets.bursts} + 1`,
      },
    });

  return { ok: true };
}
