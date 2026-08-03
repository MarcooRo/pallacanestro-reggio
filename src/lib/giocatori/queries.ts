// Letture per le schede giocatori: roster per stagione e dettaglio.

import { and, desc, eq, exists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/src/db";
import {
  clubs,
  matches,
  playerMatchStats,
  players,
  playerStints,
  teamSeasons,
} from "@/src/db/schema";
import type { StatisticheStagione } from "@/src/ingestion/sources/lba";
import { ordinaPerRuolo } from "@/src/lib/giocatori/ruoli";

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

// ---- Quintetto e leader (pagina squadra) ----

/**
 * Il quintetto base del club di casa nell'ultima partita con tabellino,
 * col risultato per il contesto. null finché non c'è un tabellino.
 */
export async function getQuintettoUltima() {
  const casa = alias(teamSeasons, "casa");
  const ospite = alias(teamSeasons, "ospite");
  const clubCasa = alias(clubs, "club_casa");
  const clubOspite = alias(clubs, "club_ospite");

  const [partita] = await db
    .select({
      id: matches.id,
      startsAt: matches.startsAt,
      homeTeam: casa.displayName,
      awayTeam: ospite.displayName,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      seasonYear: casa.seasonYear,
      reggioTeamSeasonId: sql<string>`case when ${clubCasa.isHomeClub} then ${matches.homeTeamSeasonId} else ${matches.awayTeamSeasonId} end`,
    })
    .from(matches)
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .innerJoin(clubCasa, eq(clubCasa.id, casa.clubId))
    .innerJoin(clubOspite, eq(clubOspite.id, ospite.clubId))
    .where(
      and(
        eq(matches.status, "finished"),
        or(eq(clubCasa.isHomeClub, true), eq(clubOspite.isHomeClub, true)),
        exists(
          db
            .select({ uno: sql`1` })
            .from(playerMatchStats)
            .where(
              and(
                eq(playerMatchStats.matchId, matches.id),
                eq(playerMatchStats.starter, true),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(matches.startsAt))
    .limit(1);
  if (!partita) return null;

  // distinct: un doppio stint nella stessa stagione non deve duplicare
  const titolari = await db
    .selectDistinctOn([players.id], {
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      photoKey: players.photoKey,
      jerseyNumber: playerStints.jerseyNumber,
      role: playerStints.role,
      punti: playerMatchStats.points,
    })
    .from(playerMatchStats)
    .innerJoin(players, eq(players.id, playerMatchStats.playerId))
    .innerJoin(
      playerStints,
      and(
        eq(playerStints.playerId, players.id),
        eq(playerStints.teamSeasonId, partita.reggioTeamSeasonId),
      ),
    )
    .where(
      and(
        eq(playerMatchStats.matchId, partita.id),
        eq(playerMatchStats.starter, true),
      ),
    )
    .orderBy(players.id);

  return { partita, titolari: ordinaPerRuolo(titolari).slice(0, 5) };
}

export interface LeaderStagione {
  id: string;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  partite: number;
  punti: number;
  rimbalzi: number;
  assist: number;
  stoppate: number;
  t2m: number;
  t2a: number;
  t3m: number;
  t3a: number;
}

// Sotto questa soglia di tentativi stagionali la percentuale non dice
// niente (un 1/1 varrebbe 100%): il giocatore non concorre al titolo.
const MIN_TENTATIVI = 20;

/**
 * Leader stagionali del club di casa: il migliore per media punti,
 * rimbalzi e assist. Le partite giocate sono quelle con minuti > 0
 * (il tabellino include anche chi è a referto senza entrare).
 */
export async function getLeaderStagione(seasonYear: number) {
  const [ts] = await db
    .select({ id: teamSeasons.id })
    .from(teamSeasons)
    .innerJoin(clubs, eq(clubs.id, teamSeasons.clubId))
    .where(and(eq(clubs.isHomeClub, true), eq(teamSeasons.seasonYear, seasonYear)));
  if (!ts) return null;

  const righe: LeaderStagione[] = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      photoKey: players.photoKey,
      partite: sql<number>`count(*)::int`,
      punti: sql<number>`round(avg(${playerMatchStats.points}), 1)::float`,
      rimbalzi: sql<number>`round(avg(coalesce(${playerMatchStats.rebOff}, 0) + coalesce(${playerMatchStats.rebDef}, 0)), 1)::float`,
      assist: sql<number>`round(avg(${playerMatchStats.assists}), 1)::float`,
      stoppate: sql<number>`round(avg(${playerMatchStats.blocks}), 1)::float`,
      t2m: sql<number>`coalesce(sum(${playerMatchStats.fg2m}), 0)::int`,
      t2a: sql<number>`coalesce(sum(${playerMatchStats.fg2a}), 0)::int`,
      t3m: sql<number>`coalesce(sum(${playerMatchStats.fg3m}), 0)::int`,
      t3a: sql<number>`coalesce(sum(${playerMatchStats.fg3a}), 0)::int`,
    })
    .from(playerMatchStats)
    .innerJoin(
      matches,
      and(
        eq(matches.id, playerMatchStats.matchId),
        eq(matches.status, "finished"),
        or(
          eq(matches.homeTeamSeasonId, ts.id),
          eq(matches.awayTeamSeasonId, ts.id),
        ),
      ),
    )
    .innerJoin(players, eq(players.id, playerMatchStats.playerId))
    .where(
      and(
        sql`${playerMatchStats.minutes} > 0`,
        exists(
          db
            .select({ uno: sql`1` })
            .from(playerStints)
            .where(
              and(
                eq(playerStints.playerId, players.id),
                eq(playerStints.teamSeasonId, ts.id),
              ),
            ),
        ),
      ),
    )
    .groupBy(players.id, players.firstName, players.lastName, players.photoKey);

  if (righe.length === 0) return null;
  const top = (chiave: "punti" | "rimbalzi" | "assist" | "stoppate") =>
    [...righe].sort((a, b) => b[chiave] - a[chiave])[0];
  const topPercentuale = (fatti: "t2m" | "t3m", tentati: "t2a" | "t3a") =>
    righe
      .filter((r) => r[tentati] >= MIN_TENTATIVI)
      .sort((a, b) => b[fatti] / b[tentati] - a[fatti] / a[tentati])[0] ?? null;
  return {
    punti: top("punti"),
    rimbalzi: top("rimbalzi"),
    assist: top("assist"),
    stoppate: top("stoppate"),
    tiri2: topPercentuale("t2m", "t2a"),
    tiri3: topPercentuale("t3m", "t3a"),
  };
}
