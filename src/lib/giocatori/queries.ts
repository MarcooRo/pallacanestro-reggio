// Letture per le schede giocatori: roster per stagione e dettaglio.

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { clubs, players, playerStints, teamSeasons } from "@/src/db/schema";
import type { StatisticheStagione } from "@/src/ingestion/sources/lba";

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

// Statistiche di stagione dai NOSTRI dati (v_player_season_stats,
// derivata dai tabellini ingeriti): unica fonte di verità quando c'è.
// La scheda ricade sull'API live solo se questa è vuota.
export async function statisticheStagionaliDaDb(
  playerId: string,
): Promise<StatisticheStagione[]> {
  const righe = await db.execute<{
    season_year: number;
    type_code: string;
    partite: number;
    quintetti: number;
    punti: number;
    minuti: number;
    fg2m: number;
    fg2a: number;
    fg3m: number;
    fg3a: number;
    ftm: number;
    fta: number;
    dunks: number;
    reb_off: number;
    reb_def: number;
    assists: number;
    steals: number;
    turnovers: number;
    blocks: number;
    blocks_received: number;
    fouls_committed: number;
    fouls_received: number;
    rating: number;
    oer: number;
    punti_max: number;
    rating_max: number;
  }>(sql`
    select * from v_player_season_stats
    where player_id = ${playerId}
      and season_year = (
        select max(season_year) from v_player_season_stats where player_id = ${playerId}
      )
    order by type_code desc
  `);

  return [...righe].map((r) => ({
    competizione: r.type_code,
    partite: r.partite,
    quintetti: r.quintetti,
    punti: r.punti,
    minuti: Number(r.minuti),
    fg2m: r.fg2m,
    fg2a: r.fg2a,
    fg3m: r.fg3m,
    fg3a: r.fg3a,
    ftm: r.ftm,
    fta: r.fta,
    rebOff: r.reb_off,
    rebDef: r.reb_def,
    assists: r.assists,
    steals: r.steals,
    turnovers: r.turnovers,
    blocks: r.blocks,
    blocksReceived: r.blocks_received,
    foulsCommitted: r.fouls_committed,
    foulsReceived: r.fouls_received,
    dunks: r.dunks,
    rating: Number(r.rating),
    oer: Number(r.oer),
    puntiMedia: r.partite ? r.punti / r.partite : 0,
    minutiMedia: r.partite ? Number(r.minuti) / r.partite : 0,
    ratingMedia: r.partite ? Number(r.rating) / r.partite : 0,
    assistMedia: r.partite ? r.assists / r.partite : 0,
    puntiMax: r.punti_max,
    ratingMax: Number(r.rating_max),
  }));
}
