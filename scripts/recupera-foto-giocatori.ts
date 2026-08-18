// Riempie le foto mancanti dei giocatori leggendole dai tabellini.
// Uso: bun scripts/recupera-foto-giocatori.ts [quante partite guardare]
//
// Perché serve: il roster (teams/get-team-roster) pubblica le foto solo a
// stagione avviata — per il 2026-27 sono arrivate null per tutta la lega —
// mentre il tabellino porta player_p_key, che è la stessa chiave. Chi è già
// sceso in campo ha quindi una foto anche quando il roster non ce l'ha.
//
// Da qui in avanti se ne occupa l'ingestion a ogni tabellino nuovo
// (sincronizzaTabellini): questo è il recupero una tantum sull'archivio.

import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/src/db";
import { matches, players } from "@/src/db/schema";
import { getTabellino } from "@/src/ingestion/sources/lba";

const quante = Number(process.argv[2] ?? 60);

const mancanti = await db
  .select({ lbaPlayerId: players.lbaPlayerId, cognome: players.lastName })
  .from(players)
  .where(
    and(
      isNull(players.photoKey),
      eq(players.manualOverride, false),
      isNotNull(players.lbaPlayerId),
    ),
  );

if (mancanti.length === 0) {
  console.log("Nessun giocatore senza foto: niente da fare.");
  process.exit(0);
}
const daTrovare = new Map(mancanti.map((m) => [m.lbaPlayerId!, m.cognome]));
console.log(
  `${daTrovare.size} giocatori senza foto. Cerco negli ultimi ${quante} tabellini.`,
);

const partite = await db
  .select({ lbaMatchId: matches.lbaMatchId, quando: matches.startsAt })
  .from(matches)
  .where(and(eq(matches.status, "finished"), isNotNull(matches.lbaMatchId)))
  .orderBy(desc(matches.startsAt))
  .limit(quante);

let trovate = 0;
for (const partita of partite) {
  if (daTrovare.size === 0) break;
  try {
    const tabellino = await getTabellino(partita.lbaMatchId!);
    for (const r of tabellino.righe) {
      if (!r.photoKey || !daTrovare.has(r.lbaPlayerId)) continue;
      const aggiornati = await db
        .update(players)
        .set({ photoKey: r.photoKey })
        .where(
          and(
            eq(players.lbaPlayerId, r.lbaPlayerId),
            isNull(players.photoKey),
            eq(players.manualOverride, false),
          ),
        )
        .returning({ id: players.id });
      if (aggiornati.length > 0) {
        console.log(
          `  ${daTrovare.get(r.lbaPlayerId)} ← ${r.photoKey} (partita ${partita.lbaMatchId})`,
        );
        trovate += 1;
      }
      daTrovare.delete(r.lbaPlayerId);
    }
  } catch (err) {
    console.warn(
      `  partita ${partita.lbaMatchId} saltata: ${err instanceof Error ? err.message : err}`,
    );
  }
}

console.log(`\nFoto recuperate: ${trovate}. Restano senza: ${daTrovare.size}`);
if (daTrovare.size > 0) {
  console.log(
    `Sono giocatori mai scesi in campo nelle partite in archivio: ${[...daTrovare.values()].join(", ")}`,
  );
}
process.exit(0);
