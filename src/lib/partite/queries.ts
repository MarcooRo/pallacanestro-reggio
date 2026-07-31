// Letture per calendario, dettaglio partita e pagella.
// Solo lettura: le scritture passano dalle server actions.

import { and, desc, eq, gt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/src/db";
import {
  competitions,
  matches,
  players,
  teamSeasons,
  voteTallies,
} from "@/src/db/schema";

const casa = alias(teamSeasons, "casa");
const ospite = alias(teamSeasons, "ospite");

const colonnePartita = {
  id: matches.id,
  startsAt: matches.startsAt,
  status: matches.status,
  homeScore: matches.homeScore,
  awayScore: matches.awayScore,
  dayName: matches.dayName,
  phaseId: matches.phaseId,
  venueName: matches.venueName,
  townName: matches.townName,
  referees: matches.referees,
  ticketingUrl: matches.ticketingUrl,
  votingState: matches.votingState,
  votingClosesAt: matches.votingClosesAt,
  homeTeam: casa.displayName,
  homeLogoKey: casa.logoKey,
  awayTeam: ospite.displayName,
  awayLogoKey: ospite.logoKey,
  competitionName: competitions.name,
  seasonYear: competitions.seasonYear,
  typeCode: competitions.typeCode,
};

export type PartitaLista = Awaited<ReturnType<typeof getCalendario>>[number];

export async function getCalendario(seasonYear: number) {
  return db
    .select(colonnePartita)
    .from(matches)
    .innerJoin(competitions, eq(competitions.id, matches.competitionId))
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(eq(competitions.seasonYear, seasonYear))
    .orderBy(desc(matches.startsAt));
}

export async function getPartita(id: string) {
  const [partita] = await db
    .select(colonnePartita)
    .from(matches)
    .innerJoin(competitions, eq(competitions.id, matches.competitionId))
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(eq(matches.id, id))
    .limit(1);
  return partita ?? null;
}

// Le stagioni disponibili, per il filtro del calendario.
export async function getStagioni(): Promise<number[]> {
  const righe = await db
    .selectDistinct({ seasonYear: competitions.seasonYear })
    .from(competitions)
    .innerJoin(matches, eq(matches.competitionId, competitions.id))
    .orderBy(desc(competitions.seasonYear));
  return righe.map((r) => r.seasonYear);
}

export type Votabile = {
  player_id: string;
  first_name: string;
  last_name: string;
  photo_key: string | null;
  jersey_number: string | null;
  role: string | null;
}

export async function getVotabili(matchId: string): Promise<Votabile[]> {
  const righe = await db.execute<Votabile>(
    sql`select player_id, first_name, last_name, photo_key, jersey_number, role
        from eligible_voters(${matchId})
        order by last_name, first_name`,
  );
  return [...righe];
}

// La pagella pubblicata. Vuota se la partita non è 'tallied':
// i conteggi non si leggono mai a votazione in corso.
export async function getPagella(matchId: string) {
  return db
    .select({
      playerId: voteTallies.playerId,
      firstName: players.firstName,
      lastName: players.lastName,
      photoKey: players.photoKey,
      bestCount: voteTallies.bestCount,
      supportCount: voteTallies.supportCount,
      performancePoints: voteTallies.performancePoints,
      favoriteCount: voteTallies.favoriteCount,
    })
    .from(voteTallies)
    .innerJoin(players, eq(players.id, voteTallies.playerId))
    .innerJoin(
      matches,
      and(eq(matches.id, voteTallies.matchId), eq(matches.votingState, "tallied")),
    )
    .where(eq(voteTallies.matchId, matchId))
    .orderBy(
      desc(voteTallies.performancePoints),
      desc(voteTallies.bestCount),
      desc(sql`${voteTallies.bestCount} + ${voteTallies.supportCount}`),
    );
}

export async function haVotato(matchId: string, userId: string): Promise<boolean> {
  const [riga] = await db.execute<{ uno: number }>(
    sql`select 1 as uno from votes where match_id = ${matchId} and user_id = ${userId} limit 1`,
  );
  return Boolean(riga);
}

// Per la home: la prossima partita in calendario e l'ultima pagella pubblicata.
export async function getProssimaPartita() {
  const [riga] = await db
    .select(colonnePartita)
    .from(matches)
    .innerJoin(competitions, eq(competitions.id, matches.competitionId))
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(gt(matches.startsAt, new Date()))
    .orderBy(matches.startsAt)
    .limit(1);
  return riga ?? null;
}

export async function getVotazioneAperta() {
  const [riga] = await db
    .select(colonnePartita)
    .from(matches)
    .innerJoin(competitions, eq(competitions.id, matches.competitionId))
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(eq(matches.votingState, "open"))
    .orderBy(desc(matches.startsAt))
    .limit(1);
  return riga ?? null;
}

// Le partite del club di casa, per il pannello admin: sono le uniche
// su cui ha senso aprire una votazione.
export async function getPartiteClubCasa(limite = 60) {
  return db
    .select(colonnePartita)
    .from(matches)
    .innerJoin(competitions, eq(competitions.id, matches.competitionId))
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(
      sql`exists (
        select 1 from clubs c
        where c.is_home_club
          and c.id in (${casa.clubId}, ${ospite.clubId})
      )`,
    )
    .orderBy(desc(matches.startsAt))
    .limit(limite);
}

export async function getUltimaPagella() {
  const [partita] = await db
    .select(colonnePartita)
    .from(matches)
    .innerJoin(competitions, eq(competitions.id, matches.competitionId))
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(eq(matches.votingState, "tallied"))
    .orderBy(desc(matches.startsAt))
    .limit(1);
  if (!partita) return null;
  const pagella = await getPagella(partita.id);
  return { partita, pagella };
}
