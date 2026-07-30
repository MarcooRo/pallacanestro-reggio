// Riconciliazione: club stabili, squadre-stagione collegate e mappa
// lba_team_id → team_season. Il club_code NON si usa mai per i join
// (sezione 7.2): la mappa si costruisce da get-teams a ogni stagione.

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { clubs, teamSeasons } from "@/src/db/schema";
import type { SquadraStagioneCanonica } from "@/src/ingestion/normalize";

// Inserisce club e squadre-stagione mancanti e restituisce la mappa
// lbaTeamId → team_seasons.id. Idempotente: rieseguirla non cambia nulla.
export async function riconciliaSquadre(
  squadre: SquadraStagioneCanonica[],
  homeClubLbaId: number,
): Promise<Map<number, string>> {
  const mappa = new Map<number, string>();

  for (const squadra of squadre) {
    // Il club è l'entità canonica: si crea solo se non esiste, e il nome
    // non si sovrascrive mai con quello commerciale della stagione.
    await db
      .insert(clubs)
      .values({
        lbaClubId: squadra.lbaClubId,
        name: squadra.displayName,
        shortName: squadra.lbaClubCode ?? squadra.displayName,
        isHomeClub: squadra.lbaClubId === homeClubLbaId,
      })
      .onConflictDoNothing({ target: clubs.lbaClubId });

    const [club] = await db
      .select({ id: clubs.id })
      .from(clubs)
      .where(eq(clubs.lbaClubId, squadra.lbaClubId))
      .limit(1);

    const [stagione] = await db
      .insert(teamSeasons)
      .values({
        clubId: club.id,
        seasonYear: squadra.seasonYear,
        lbaTeamId: squadra.lbaTeamId,
        displayName: squadra.displayName,
        lbaClubCode: squadra.lbaClubCode,
        logoKey: squadra.logoKey,
      })
      .onConflictDoUpdate({
        target: teamSeasons.lbaTeamId,
        set: {
          displayName: squadra.displayName,
          lbaClubCode: squadra.lbaClubCode,
          logoKey: squadra.logoKey,
        },
      })
      .returning({ id: teamSeasons.id });

    mappa.set(squadra.lbaTeamId, stagione.id);
  }

  return mappa;
}
