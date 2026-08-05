// I due quintetti da schierare nella pagina partita, finché la gara non è
// finita.
//
// La fonte NON pubblica le formazioni ufficiali prima della palla a due:
// quindi prima della gara si mostra il quintetto dell'ultima partita
// giocata da ciascuna squadra (etichettato come tale, mai spacciato per
// formazione ufficiale), e a gara iniziata i titolari veri, letti dal
// tabellino della gara stessa.
//
// Tutto dalla fonte, niente scritture: i tabellini delle avversarie non si
// memorizzano (cfr. tabellino-live.ts). Numeri e ruoli arrivano dal roster
// della squadra, che è l'unico posto dove la fonte dice il ruolo.

import { and, desc, eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/src/db";
import { matches, teamSeasons } from "@/src/db/schema";
import type { RigaTabellinoCanonica } from "@/src/ingestion/normalize";
import { getTabellino } from "@/src/ingestion/sources/lba";
import { etichettaStagione } from "@/src/lib/date";
import { ordinaPerRuolo } from "@/src/lib/giocatori/ruoli";
import { getRosterLive } from "@/src/lib/squadre/queries";

export interface TitolareCampo {
  id: string;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  jerseyNumber: string | null;
  role: string | null;
}

export interface Formazione {
  /** Da dove arriva il quintetto, da scrivere in chiaro nella pagina */
  fonte: string;
  titolari: TitolareCampo[];
}

export interface QuintettiPartita {
  casa: Formazione;
  ospiti: Formazione;
}

// Il tabellino della gara in corso: cache breve, il quintetto si sa alla
// palla a due e da lì non cambia più.
const CACHE_IN_CORSO = 600;
const CACHE_ARCHIVIO = 3600;

export async function getQuintettiPartita(
  matchId: string,
): Promise<QuintettiPartita | null> {
  const casa = alias(teamSeasons, "q_casa");
  const ospite = alias(teamSeasons, "q_ospite");

  const [partita] = await db
    .select({
      lbaMatchId: matches.lbaMatchId,
      status: matches.status,
      startsAt: matches.startsAt,
      seasonYear: casa.seasonYear,
      casaClubId: casa.clubId,
      ospitiClubId: ospite.clubId,
      casaLbaTeamId: casa.lbaTeamId,
      ospitiLbaTeamId: ospite.lbaTeamId,
    })
    .from(matches)
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!partita) return null;

  // A palla a due passata i titolari veri sono nel tabellino della gara.
  const iniziata =
    partita.status === "live" || partita.startsAt <= new Date();
  if (iniziata && partita.lbaMatchId) {
    const righe = await righeTabellino(partita.lbaMatchId, CACHE_IN_CORSO);
    const titolariCasa = righe.filter((r) => r.lato === "home" && r.starter);
    const titolariOspiti = righe.filter((r) => r.lato === "away" && r.starter);
    if (titolariCasa.length > 0 && titolariOspiti.length > 0) {
      const [c, o] = await Promise.all([
        conRuoli(titolariCasa, partita.casaLbaTeamId),
        conRuoli(titolariOspiti, partita.ospitiLbaTeamId),
      ]);
      return {
        casa: { fonte: "quintetto base", titolari: c },
        ospiti: { fonte: "quintetto base", titolari: o },
      };
    }
  }

  // Prima della gara: l'ultima uscita di ciascuna, che è il massimo che la
  // fonte permette di dire.
  const [c, o] = await Promise.all([
    quintettoUltima(
      partita.casaClubId,
      partita.casaLbaTeamId,
      partita.seasonYear,
      partita.startsAt,
    ),
    quintettoUltima(
      partita.ospitiClubId,
      partita.ospitiLbaTeamId,
      partita.seasonYear,
      partita.startsAt,
    ),
  ]);
  if (!c && !o) return null;

  return {
    casa: c ?? { fonte: "quintetto non disponibile", titolari: [] },
    ospiti: o ?? { fonte: "quintetto non disponibile", titolari: [] },
  };
}

/**
 * Il quintetto dell'ultima uscita di una squadra qualsiasi, per la sua
 * scheda: la pagina di Reggio mostra il campo con l'ultimo quintetto e le
 * avversarie devono avere lo stesso.
 */
export async function getQuintettoSquadra(
  lbaTeamId: number,
): Promise<Formazione | null> {
  const [squadra] = await db
    .select({ clubId: teamSeasons.clubId, seasonYear: teamSeasons.seasonYear })
    .from(teamSeasons)
    .where(eq(teamSeasons.lbaTeamId, lbaTeamId))
    .limit(1);
  if (!squadra) return null;

  return quintettoUltima(
    squadra.clubId,
    lbaTeamId,
    squadra.seasonYear,
    new Date(),
  );
}

async function righeTabellino(
  lbaMatchId: number,
  revalidate: number,
): Promise<RigaTabellinoCanonica[]> {
  try {
    return (await getTabellino(lbaMatchId, revalidate)).righe;
  } catch {
    // Fonte giù o gara senza tabellino: la sezione si arrangia senza.
    return [];
  }
}

/**
 * Il quintetto schierato dalla società nella sua ultima gara giocata. La
 * ricerca è per club e non per stagione: a inizio campionato l'ultima
 * uscita è quella dell'annata prima. In quel caso i titolari si filtrano
 * su chi è ancora in rosa — chi è andato via non si schiera più — e
 * l'etichetta dice la stagione, non l'avversario.
 */
async function quintettoUltima(
  clubId: string,
  // null per le squadre solo di coppa (BCL): niente roster LBA, i ruoli
  // restano ignoti e il quintetto storico non esiste in archivio
  lbaTeamId: number | null,
  stagioneCorrente: number,
  primaDi: Date,
): Promise<Formazione | null> {
  const casa = alias(teamSeasons, "u_casa");
  const ospite = alias(teamSeasons, "u_ospite");
  const nostro = sql`${casa.clubId} = ${clubId}`;

  const [ultima] = await db
    .select({
      lbaMatchId: matches.lbaMatchId,
      seasonYear: casa.seasonYear,
      lato: sql<"home" | "away">`case when ${nostro} then 'home' else 'away' end`,
      avversario: sql<string>`case when ${nostro} then ${ospite.displayName} else ${casa.displayName} end`,
    })
    .from(matches)
    .innerJoin(casa, eq(casa.id, matches.homeTeamSeasonId))
    .innerJoin(ospite, eq(ospite.id, matches.awayTeamSeasonId))
    .where(
      and(
        eq(matches.status, "finished"),
        isNotNull(matches.lbaMatchId),
        lt(matches.startsAt, primaDi),
        or(eq(casa.clubId, clubId), eq(ospite.clubId, clubId)),
      ),
    )
    .orderBy(desc(matches.startsAt))
    .limit(1);
  if (!ultima) return null;

  const righe = (await righeTabellino(ultima.lbaMatchId!, CACHE_ARCHIVIO)).filter(
    (r) => r.lato === ultima.lato && r.starter,
  );
  if (righe.length === 0) return null;

  const stessaStagione = ultima.seasonYear === stagioneCorrente;
  const titolari = await conRuoli(righe, lbaTeamId, !stessaStagione);
  // Di un'altra stagione: sotto i tre superstiti non è più un quintetto.
  if (titolari.length === 0 || (!stessaStagione && titolari.length < 3)) return null;

  return {
    fonte: stessaStagione
      ? `quintetto dell'ultima · ${ultima.avversario}`
      : `quintetto ${etichettaStagione(ultima.seasonYear)}`,
    titolari,
  };
}

// Ruolo e numero dal roster della squadra (cache 1h): il tabellino non
// porta il ruolo, e senza ruolo il campo schiererebbe i lunghi in regia.
async function conRuoli(
  righe: RigaTabellinoCanonica[],
  lbaTeamId: number | null,
  soloChiEInRosa = false,
): Promise<TitolareCampo[]> {
  // Squadra fuori dal mondo LBA (coppa): nessun roster da cui pescare.
  const roster = lbaTeamId ? await getRosterLive(lbaTeamId) : [];
  const perLbaPlayerId = new Map(roster.map((g) => [g.lbaPlayerId, g]));
  // Roster non ancora pubblicato (succede da luglio a settembre): non si
  // può dire chi è rimasto, e allora si mostra il quintetto storico così
  // com'era — l'etichetta dice a quale stagione appartiene.
  const filtra = soloChiEInRosa && perLbaPlayerId.size > 0;

  return ordinaPerRuolo(
    righe
      .filter((r) => !filtra || perLbaPlayerId.has(r.lbaPlayerId))
      .map((r) => {
      const g = perLbaPlayerId.get(r.lbaPlayerId);
      return {
        id: String(r.lbaPlayerId),
        firstName: r.firstName,
        lastName: r.lastName,
        photoKey: r.photoKey ?? g?.photoKey ?? null,
        jerseyNumber: r.jerseyNumber ?? g?.jerseyNumber ?? null,
        role: g?.role ?? null,
      };
    }),
  ).slice(0, 5);
}
