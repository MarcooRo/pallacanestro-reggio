// Scheda di una squadra qualsiasi della Serie A: anagrafica dal nostro
// DB (team_seasons copre tutto il campionato), roster letto al volo
// dalla fonte con la cache di Next — come tabellini e classifica,
// niente scritture per le squadre che non sono Reggio.

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { clubs, teamSeasons } from "@/src/db/schema";
import { getRoster } from "@/src/ingestion/sources/lba";

export async function getSquadra(lbaTeamId: number) {
  const [squadra] = await db
    .select({
      lbaTeamId: teamSeasons.lbaTeamId,
      displayName: teamSeasons.displayName,
      logoKey: teamSeasons.logoKey,
      seasonYear: teamSeasons.seasonYear,
      isReggio: clubs.isHomeClub,
    })
    .from(teamSeasons)
    .innerJoin(clubs, eq(clubs.id, teamSeasons.clubId))
    .where(eq(teamSeasons.lbaTeamId, lbaTeamId));
  return squadra ?? null;
}

export interface GiocatoreRosterLive {
  lbaPlayerId: number;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  nationality: string | null;
  jerseyNumber: string | null;
  role: string | null;
}

export async function getRosterLive(
  lbaTeamId: number,
): Promise<GiocatoreRosterLive[]> {
  try {
    const { giocatori, permanenze } = await getRoster(lbaTeamId, 3600);
    const perGiocatore = new Map(permanenze.map((p) => [p.lbaPlayerId, p]));
    return giocatori
      .map((g) => ({
        lbaPlayerId: g.lbaPlayerId,
        firstName: g.firstName,
        lastName: g.lastName,
        photoKey: g.photoKey,
        nationality: g.nationality,
        jerseyNumber: perGiocatore.get(g.lbaPlayerId)?.jerseyNumber ?? null,
        role: perGiocatore.get(g.lbaPlayerId)?.role ?? null,
      }))
      .sort(
        (a, b) => Number(a.jerseyNumber ?? 999) - Number(b.jerseyNumber ?? 999),
      );
  } catch {
    // Fonte giù: la pagina resta con la sola testata, senza rompere.
    return [];
  }
}
