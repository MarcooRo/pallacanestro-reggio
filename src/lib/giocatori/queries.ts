// Letture per le schede giocatori: roster per stagione e dettaglio.

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { clubs, players, playerStints, teamSeasons } from "@/src/db/schema";

// Il roster del club di casa per una stagione (tutte le permanenze,
// anche quelle concluse: chi è partito a gennaio resta nella stagione).
export async function getRosterStagione(seasonYear: number) {
  return db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      photoKey: players.photoKey,
      nationality: players.nationality,
      jerseyNumber: playerStints.jerseyNumber,
      role: playerStints.role,
      startDate: playerStints.startDate,
      endDate: playerStints.endDate,
    })
    .from(playerStints)
    .innerJoin(players, eq(players.id, playerStints.playerId))
    .innerJoin(teamSeasons, eq(teamSeasons.id, playerStints.teamSeasonId))
    .innerJoin(clubs, eq(clubs.id, teamSeasons.clubId))
    .where(and(eq(clubs.isHomeClub, true), eq(teamSeasons.seasonYear, seasonYear)));
}

// Le stagioni per cui esiste un roster del club di casa.
export async function getStagioniRoster(): Promise<number[]> {
  const righe = await db
    .selectDistinct({ seasonYear: teamSeasons.seasonYear })
    .from(playerStints)
    .innerJoin(teamSeasons, eq(teamSeasons.id, playerStints.teamSeasonId))
    .innerJoin(clubs, eq(clubs.id, teamSeasons.clubId))
    .where(eq(clubs.isHomeClub, true))
    .orderBy(desc(teamSeasons.seasonYear));
  return righe.map((r) => r.seasonYear);
}

export async function getGiocatore(id: string) {
  const giocatore = await db.query.players.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    // l'età si calcola nel DB: i componenti restano puri
    extras: {
      etaAnni: sql<number | null>`date_part('year', age(${players.birthDate}))::int`.as(
        "eta_anni",
      ),
    },
  });
  if (!giocatore) return null;

  const permanenze = await db
    .select({
      seasonYear: teamSeasons.seasonYear,
      squadra: teamSeasons.displayName,
      jerseyNumber: playerStints.jerseyNumber,
      role: playerStints.role,
      startDate: playerStints.startDate,
      endDate: playerStints.endDate,
    })
    .from(playerStints)
    .innerJoin(teamSeasons, eq(teamSeasons.id, playerStints.teamSeasonId))
    .where(eq(playerStints.playerId, id))
    .orderBy(desc(teamSeasons.seasonYear), desc(playerStints.startDate));

  return { ...giocatore, permanenze };
}
