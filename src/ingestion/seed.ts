// Seed iniziale: stagione corrente e precedente (o anni passati come
// argomenti). Idempotente: si può rieseguire quando la fonte pubblica
// nuovi dati. La logica vive in sync.ts, condivisa con i cron.
//
// Uso: bun run seed [anno ...]   (env da .env.local; richiede HOME_CLUB_LBA_ID)

import { getCompetizioniCorrenti } from "@/src/ingestion/sources/lba";
import {
  sincronizzaCalendarioBcl,
  sincronizzaStagione,
  sincronizzaTabellini,
} from "@/src/ingestion/sync";

async function main() {
  const homeClubLbaId = Number(process.env.HOME_CLUB_LBA_ID);
  if (!homeClubLbaId) {
    throw new Error(
      "HOME_CLUB_LBA_ID non impostata (club_id LBA del club di casa, es. 44 per Reggio)",
    );
  }

  // L'anno corrente si risolve dalla fonte, non dal calendario di sistema.
  const stagioniArg = process.argv.slice(2).map(Number).filter(Number.isInteger);
  let stagioni = stagioniArg;
  if (stagioni.length === 0) {
    const correnti = await getCompetizioniCorrenti();
    const annoCorrente = Math.max(...correnti.map((c) => c.seasonYear));
    stagioni = [annoCorrente - 1, annoCorrente];
  }

  for (const anno of stagioni) {
    await sincronizzaStagione(anno, homeClubLbaId);
  }

  console.log("\nCoppa europea (BCL)…");
  const bcl = await sincronizzaCalendarioBcl();
  console.log(
    bcl
      ? `  ${bcl.competizione}: ${bcl.totali} partite (${bcl.nuove} nuove, ${bcl.cambiate} cambiate)`
      : "  Reggio non gioca la BCL in questa stagione.",
  );

  console.log("\nTabellini delle partite giocate…");
  const diff = await sincronizzaTabellini(1000);
  console.log(
    `  ${diff.sincronizzate}/${diff.candidate} tabellini, ${diff.righeScritte} righe, ${diff.giocatoriNuovi} giocatori nuovi` +
      (diff.partiteFallite.length ? `, falliti: ${diff.partiteFallite.join(",")}` : ""),
  );

  console.log("\nSeed completato.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
