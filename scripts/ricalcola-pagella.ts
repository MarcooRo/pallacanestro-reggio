// Ricalcola i conteggi di una pagella già pubblicata rileggendo i voti
// espressi: serve quando cambiano i pesi (es. il passaggio al podio 3-2-1).
// Uso: bun scripts/ricalcola-pagella.ts <match_id>
//
// Stessa logica del bottone "Ricalcola pagella" in /admin: questo è il
// percorso senza sessione, per le manutenzioni una volta sola.

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { voteTallies } from "@/src/db/schema";
import { calcolaTally } from "@/src/lib/voto/tally";

const matchId = process.argv[2];
if (!matchId) {
  console.error("Uso: bun scripts/ricalcola-pagella.ts <match_id>");
  process.exit(1);
}

const voti = await db.query.votes.findMany({
  columns: {
    bestPlayerId: true,
    optionalAId: true,
    optionalBId: true,
    favoritePlayerId: true,
  },
  where: (v, { eq: uguale }) => uguale(v.matchId, matchId),
});

if (voti.length === 0) {
  console.error("Nessun voto per questa partita: niente da ricalcolare.");
  process.exit(1);
}

const tally = calcolaTally(voti);

await db.transaction(async (tx) => {
  await tx.delete(voteTallies).where(eq(voteTallies.matchId, matchId));
  await tx.insert(voteTallies).values(
    tally.map((r) => ({
      matchId,
      playerId: r.playerId,
      bestCount: r.bestCount,
      secondCount: r.secondCount,
      thirdCount: r.thirdCount,
      supportCount: r.supportCount,
      performancePoints: r.performancePoints,
      favoriteCount: r.favoriteCount,
    })),
  );
});

console.log(`${voti.length} voti riletti, ${tally.length} righe riscritte:`);
for (const r of tally) {
  console.log(
    `  ${r.performancePoints} pt — ${r.bestCount}× migliore, ${r.secondCount}× secondo, ${r.thirdCount}× terzo, ${r.favoriteCount}× preferito`,
  );
}
process.exit(0);
