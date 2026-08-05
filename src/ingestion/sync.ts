// Sincronizzazione dalla fonte LBA: usata dallo script di seed e dai
// route handler dei cron. Handler idempotenti (regola 3): rieseguire
// non produce effetti diversi. Ogni sync ritorna un riepilogo che il
// chiamante logga in ingestion_runs con il diff (regola 4).

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/src/db";
import {
  clubs,
  ingestionRuns,
  matches,
  players,
  playerMatchStats,
  playerStints,
  teamSeasons,
  competitions as tabCompetizioni,
} from "@/src/db/schema";
import type {
  CompetizioneCanonica,
  SquadraBclCanonica,
  SquadraStagioneCanonica,
} from "@/src/ingestion/normalize";
import {
  getCompetizioneBcl,
  getPartiteBcl,
  getSquadreBcl,
  STATUS_CODE_BCL_VERIFICATI,
} from "@/src/ingestion/sources/bcl";
import { riconciliaSquadre } from "@/src/ingestion/reconcile";
import {
  getCalendario,
  getCompetizioniCorrenti,
  getCompetizioniStagione,
  getRoster,
  getSquadreStagione,
  getTabellino,
  TYPE_CODE_VERIFICATI,
} from "@/src/ingestion/sources/lba";

// Scrive l'esito di un run in ingestion_runs. Un fallimento del log non
// deve mai far fallire il sync.
export async function logIngestione(
  source: string,
  target: string,
  esito: {
    status?: "ok" | "partial" | "failed";
    seen?: number;
    changed?: number;
    diff?: unknown;
    errore?: string;
  },
) {
  try {
    await db.insert(ingestionRuns).values({
      source,
      target,
      status: esito.status ?? (esito.errore ? "failed" : "ok"),
      finishedAt: new Date(),
      recordsSeen: esito.seen ?? null,
      recordsChanged: esito.changed ?? null,
      diff: esito.diff ?? null,
      error: esito.errore ?? null,
    });
  } catch (err) {
    console.warn("ingestion_runs non scrivibile:", err);
  }
}

// Un type_code mai visto non deve passare in silenzio (sezione 7.5).
export async function segnalaTypeCodeSconosciuti(
  competizioni: CompetizioneCanonica[],
) {
  const sconosciute = competizioni.filter(
    (c) => !TYPE_CODE_VERIFICATI.has(c.typeCode),
  );
  for (const c of sconosciute) {
    const nota = `type_code sconosciuto "${c.typeCode}" per championship ${c.lbaChampionshipId} (${c.name}): verificarlo e aggiungerlo a TYPE_CODE_VERIFICATI`;
    console.warn(nota);
    await logIngestione("lba", "competitions", {
      status: "partial",
      seen: competizioni.length,
      errore: nota,
    });
  }
}

async function upsertCompetizione(c: CompetizioneCanonica): Promise<string> {
  const [riga] = await db
    .insert(tabCompetizioni)
    .values({
      lbaChampionshipId: c.lbaChampionshipId,
      seasonYear: c.seasonYear,
      seriesCode: c.seriesCode,
      typeCode: c.typeCode,
      name: c.name,
      logoKey: c.logoKey,
    })
    .onConflictDoUpdate({
      target: tabCompetizioni.lbaChampionshipId,
      set: { name: c.name, logoKey: c.logoKey },
    })
    .returning({ id: tabCompetizioni.id });
  return riga.id;
}

// ---- Roster del club di casa ----

export async function sincronizzaRoster(
  squadraCasa: SquadraStagioneCanonica,
  teamSeasonId: string,
): Promise<{ giocatori: number }> {
  const { giocatori, permanenze } = await getRoster(squadraCasa.lbaTeamId);
  if (giocatori.length === 0) {
    console.warn(
      `Roster ${squadraCasa.displayName} ancora vuoto sulla fonte: riprovare più avanti.`,
    );
    return { giocatori: 0 };
  }

  const mappaGiocatori = new Map<number, string>();
  for (const g of giocatori) {
    const [riga] = await db
      .insert(players)
      .values({
        lbaPlayerId: g.lbaPlayerId,
        lbaCode: g.lbaCode,
        firstName: g.firstName,
        lastName: g.lastName,
        birthDate: g.birthDate,
        birthPlace: g.birthPlace,
        nationality: g.nationality,
        heightCm: g.heightCm,
        weightKg: g.weightKg,
        photoKey: g.photoKey,
      })
      .onConflictDoUpdate({
        target: players.lbaPlayerId,
        set: {
          lbaCode: g.lbaCode,
          firstName: g.firstName,
          lastName: g.lastName,
          birthDate: g.birthDate,
          birthPlace: g.birthPlace,
          nationality: g.nationality,
          heightCm: g.heightCm,
          weightKg: g.weightKg,
          photoKey: g.photoKey,
        },
        // Se l'admin ha corretto a mano, l'ingestion non tocca (regola 2).
        setWhere: sql`${players.manualOverride} = false`,
      })
      .returning({ id: players.id });
    mappaGiocatori.set(g.lbaPlayerId, riga.id);
  }

  for (const p of permanenze) {
    await db
      .insert(playerStints)
      .values({
        playerId: mappaGiocatori.get(p.lbaPlayerId)!,
        teamSeasonId,
        startDate: p.startDate,
        endDate: p.endDate,
        jerseyNumber: p.jerseyNumber,
        role: p.role,
        roleId: p.roleId,
        uefaRatio: p.uefaRatio,
      })
      .onConflictDoUpdate({
        target: [
          playerStints.playerId,
          playerStints.teamSeasonId,
          playerStints.startDate,
        ],
        set: {
          endDate: p.endDate,
          jerseyNumber: p.jerseyNumber,
          role: p.role,
          roleId: p.roleId,
          uefaRatio: p.uefaRatio,
        },
      });
  }
  return { giocatori: giocatori.length };
}

// ---- Calendario di una competizione ----

export interface DiffCalendario {
  competizione: string;
  totali: number;
  nuove: number;
  cambiate: number;
  saltate: number;
  idCambiate: number[];
}

export async function sincronizzaCalendarioCompetizione(
  competizione: CompetizioneCanonica,
  mappaSquadre: Map<number, string>,
): Promise<DiffCalendario | null> {
  const partite = await getCalendario(competizione.lbaChampionshipId);
  const mappabili = partite.filter(
    (p) => mappaSquadre.has(p.homeLbaTeamId) && mappaSquadre.has(p.awayLbaTeamId),
  );

  // Competizione di un'altra serie (es. giovanili): non entra nel database.
  if (partite.length > 0 && mappabili.length === 0) return null;

  const competitionId = await upsertCompetizione(competizione);

  // Stato attuale per il diff: cosa c'era prima del sync.
  const esistenti = await db
    .select({
      lbaMatchId: matches.lbaMatchId,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      startsAt: matches.startsAt,
    })
    .from(matches)
    .where(eq(matches.competitionId, competitionId));
  const prima = new Map(esistenti.map((m) => [m.lbaMatchId, m]));

  const diff: DiffCalendario = {
    competizione: competizione.name,
    totali: partite.length,
    nuove: 0,
    cambiate: 0,
    saltate: partite.length - mappabili.length,
    idCambiate: [],
  };

  for (const p of mappabili) {
    const vecchia = prima.get(p.lbaMatchId);
    if (!vecchia) diff.nuove++;
    else if (
      vecchia.status !== p.status ||
      vecchia.homeScore !== p.homeScore ||
      vecchia.awayScore !== p.awayScore ||
      vecchia.startsAt.getTime() !== p.startsAt.getTime()
    ) {
      diff.cambiate++;
      diff.idCambiate.push(p.lbaMatchId);
    }

    await db
      .insert(matches)
      .values({
        lbaMatchId: p.lbaMatchId,
        competitionId,
        phaseId: p.phaseId,
        daySerial: p.daySerial,
        dayName: p.dayName,
        startsAt: p.startsAt,
        homeTeamSeasonId: mappaSquadre.get(p.homeLbaTeamId)!,
        awayTeamSeasonId: mappaSquadre.get(p.awayLbaTeamId)!,
        status: p.status,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        additionalTime: p.additionalTime,
        venueName: p.venueName,
        townName: p.townName,
        referees: p.referees,
        ticketingUrl: p.ticketingUrl,
        hasStreaming: p.hasStreaming,
        websocketMatchId: p.websocketMatchId,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: matches.lbaMatchId,
        // Solo i campi di sincronizzazione: lo stato del voto non si tocca.
        set: {
          phaseId: p.phaseId,
          daySerial: p.daySerial,
          dayName: p.dayName,
          startsAt: p.startsAt,
          status: p.status,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          additionalTime: p.additionalTime,
          venueName: p.venueName,
          townName: p.townName,
          referees: p.referees,
          ticketingUrl: p.ticketingUrl,
          hasStreaming: p.hasStreaming,
          websocketMatchId: p.websocketMatchId,
          lastSyncedAt: new Date(),
        },
        setWhere: sql`${matches.manualOverride} = false`,
      });
  }

  return diff;
}

// ---- Sync interi, per il cron ----

// Mappa lba_team_id → team_season dal database (le squadre le aggiorna
// il sync anagrafiche): il calendario non richiama get-teams ogni volta.
// Le squadre solo di coppa (lba_team_id null) qui non c'entrano.
async function mappaSquadreDaDb(): Promise<Map<number, string>> {
  const righe = await db
    .select({ lbaTeamId: teamSeasons.lbaTeamId, id: teamSeasons.id })
    .from(teamSeasons)
    .where(sql`${teamSeasons.lbaTeamId} is not null`);
  return new Map(righe.map((r) => [r.lbaTeamId!, r.id]));
}

export async function sincronizzaCalendarioCorrente(): Promise<DiffCalendario[]> {
  const competizioni = await getCompetizioniCorrenti();
  await segnalaTypeCodeSconosciuti(competizioni);
  const mappaSquadre = await mappaSquadreDaDb();

  const diffs: DiffCalendario[] = [];
  for (const c of competizioni) {
    try {
      const diff = await sincronizzaCalendarioCompetizione(c, mappaSquadre);
      if (diff) diffs.push(diff);
    } catch (err) {
      // Last-known-good: un fetch fallito non sovrascrive e non blocca.
      console.warn(`Calendario "${c.name}" non disponibile:`, err);
      await logIngestione("lba", "calendar", {
        errore: `${c.name}: ${err instanceof Error ? err.message : err}`,
      });
    }
  }
  return diffs;
}

// ---- Coppa europea (BCL) ----
//
// Solo le partite di Reggio (scelta di prodotto): la fonte è l'API FIBA
// dell'adapter bcl.ts. Le avversarie entrano come club/team_season senza
// id LBA (lba_team_id null → niente scheda /squadre, per scelta).

export interface DiffBcl {
  competizione: string;
  totali: number;
  nuove: number;
  cambiate: number;
}

// La stagione da sincronizzare è quella del campionato in corso nel
// database: la BCL non fa da àncora temporale, il campionato sì.
async function stagioneCorrenteDaDb(): Promise<number | null> {
  const [riga] = await db
    .select({ anno: sql<number | null>`max(${tabCompetizioni.seasonYear})` })
    .from(tabCompetizioni)
    .where(sql`${tabCompetizioni.lbaChampionshipId} is not null`);
  return riga?.anno ?? null;
}

export async function sincronizzaCalendarioBcl(): Promise<DiffBcl | null> {
  const seasonYear = await stagioneCorrenteDaDb();
  if (!seasonYear) return null; // database ancora vergine: prima il seed LBA

  const competizione = await getCompetizioneBcl(seasonYear);
  if (!competizione) return null; // nessuna BCL per la stagione

  // Reggio tra le squadre della competizione: per àncora FIBA se già
  // nota, altrimenti per nome (prima volta), e l'àncora si persiste.
  const [reggio] = await db
    .select()
    .from(clubs)
    .where(eq(clubs.isHomeClub, true))
    .limit(1);
  if (!reggio) throw new Error("club di casa assente: eseguire prima il seed");

  const squadre = await getSquadreBcl(competizione.fibaCompetitionId);
  const somiglia = (nome: string) => {
    const a = nome.toLowerCase();
    const b = reggio.name.toLowerCase();
    return a.includes(b) || b.includes(a);
  };
  const squadraReggio = squadre.find((s) =>
    reggio.fibaOrganisationId
      ? s.fibaOrganisationId === reggio.fibaOrganisationId
      : somiglia(s.nome),
  );
  if (!squadraReggio) return null; // Reggio non gioca la BCL quest'anno

  if (!reggio.fibaOrganisationId) {
    await db
      .update(clubs)
      .set({ fibaOrganisationId: squadraReggio.fibaOrganisationId })
      .where(eq(clubs.id, reggio.id));
  }

  // La team_season di Reggio la crea il sync LBA: qui si aggancia solo
  // l'id FIBA della stagione. Il logo resta quello LBA.
  const [tsReggio] = await db
    .select({ id: teamSeasons.id, fibaTeamId: teamSeasons.fibaTeamId })
    .from(teamSeasons)
    .where(
      and(
        eq(teamSeasons.clubId, reggio.id),
        eq(teamSeasons.seasonYear, seasonYear),
      ),
    )
    .limit(1);
  if (!tsReggio) {
    throw new Error(
      `team_season di Reggio per la ${seasonYear} assente: eseguire prima il sync LBA`,
    );
  }
  if (tsReggio.fibaTeamId !== squadraReggio.fibaTeamId) {
    await db
      .update(teamSeasons)
      .set({ fibaTeamId: squadraReggio.fibaTeamId })
      .where(eq(teamSeasons.id, tsReggio.id));
  }

  const [rigaComp] = await db
    .insert(tabCompetizioni)
    .values({
      fibaCompetitionId: competizione.fibaCompetitionId,
      seasonYear: competizione.seasonYear,
      seriesCode: "BCL",
      typeCode: "BCL",
      name: competizione.name,
    })
    .onConflictDoUpdate({
      target: tabCompetizioni.fibaCompetitionId,
      set: { name: competizione.name, seasonYear: competizione.seasonYear },
    })
    .returning({ id: tabCompetizioni.id });
  const competitionId = rigaComp.id;

  const partite = await getPartiteBcl(squadraReggio.fibaTeamId);

  // Codici di stato mai visti: segnalati, non ingoiati (regola 4).
  const ignoti = [
    ...new Set(
      partite
        .map((p) => p.statusCodeFonte)
        .filter((c) => !STATUS_CODE_BCL_VERIFICATI.has(c)),
    ),
  ];
  for (const codice of ignoti) {
    const nota = `statusCode FIBA sconosciuto "${codice}": verificarlo in sources/bcl.ts`;
    console.warn(nota);
    await logIngestione("bcl", "calendar", {
      status: "partial",
      seen: partite.length,
      errore: nota,
    });
  }

  // Le avversarie: club ancorato all'organisation FIBA, team_season alla
  // squadra della stagione. Se un'avversaria fosse anche un club LBA
  // (italiana in BCL) nascerebbe un doppione innocuo: senza lba_team_id
  // non compare in nessuna scheda, e le gare BCL non esistono in LBA.
  const teamSeasonDi = async (s: SquadraBclCanonica): Promise<string> => {
    if (s.fibaTeamId === squadraReggio.fibaTeamId) return tsReggio.id;
    const [club] = await db
      .insert(clubs)
      .values({
        fibaOrganisationId: s.fibaOrganisationId,
        name: s.nome,
        shortName: s.nome,
      })
      .onConflictDoUpdate({
        target: clubs.fibaOrganisationId,
        set: { name: s.nome },
      })
      .returning({ id: clubs.id });
    const [ts] = await db
      .insert(teamSeasons)
      .values({
        clubId: club.id,
        seasonYear,
        fibaTeamId: s.fibaTeamId,
        displayName: s.nome,
        logoKey: s.logoUrl, // URL pieno FIBA: fotoUrl lo passa com'è
      })
      .onConflictDoUpdate({
        target: teamSeasons.fibaTeamId,
        set: { displayName: s.nome, logoKey: s.logoUrl },
      })
      .returning({ id: teamSeasons.id });
    return ts.id;
  };

  // Diff su ciò che c'era prima, come per il calendario LBA.
  const esistenti = await db
    .select({
      fibaGameId: matches.fibaGameId,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      startsAt: matches.startsAt,
    })
    .from(matches)
    .where(eq(matches.competitionId, competitionId));
  const prima = new Map(esistenti.map((m) => [m.fibaGameId, m]));

  const diff: DiffBcl = {
    competizione: competizione.name,
    totali: partite.length,
    nuove: 0,
    cambiate: 0,
  };

  for (const p of partite) {
    const vecchia = prima.get(p.fibaGameId);
    if (!vecchia) diff.nuove++;
    else if (
      vecchia.status !== p.status ||
      vecchia.homeScore !== p.homeScore ||
      vecchia.awayScore !== p.awayScore ||
      vecchia.startsAt.getTime() !== p.startsAt.getTime()
    ) {
      diff.cambiate++;
    }

    const homeTeamSeasonId = await teamSeasonDi(p.casa);
    const awayTeamSeasonId = await teamSeasonDi(p.ospite);

    await db
      .insert(matches)
      .values({
        fibaGameId: p.fibaGameId,
        competitionId,
        daySerial: p.daySerial,
        dayName: p.dayName,
        startsAt: p.startsAt,
        homeTeamSeasonId,
        awayTeamSeasonId,
        status: p.status,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        venueName: p.venueName,
        townName: p.townName,
        ticketingUrl: p.ticketingUrl,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: matches.fibaGameId,
        // Solo i campi di sincronizzazione: lo stato del voto non si tocca.
        set: {
          daySerial: p.daySerial,
          dayName: p.dayName,
          startsAt: p.startsAt,
          status: p.status,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          venueName: p.venueName,
          townName: p.townName,
          ticketingUrl: p.ticketingUrl,
          lastSyncedAt: new Date(),
        },
        setWhere: sql`${matches.manualOverride} = false`,
      });
  }

  return diff;
}

export async function sincronizzaAnagrafiche(
  homeClubLbaId: number,
): Promise<{ squadre: number; giocatori: number }> {
  const correnti = await getCompetizioniCorrenti();
  await segnalaTypeCodeSconosciuti(correnti);
  const anno = Math.max(...correnti.map((c) => c.seasonYear));

  const squadre = await getSquadreStagione(anno);
  const mappaSquadre = await riconciliaSquadre(squadre, homeClubLbaId);

  const squadraCasa = squadre.find((s) => s.lbaClubId === homeClubLbaId);
  let giocatori = 0;
  if (squadraCasa) {
    const esito = await sincronizzaRoster(
      squadraCasa,
      mappaSquadre.get(squadraCasa.lbaTeamId)!,
    );
    giocatori = esito.giocatori;
  }
  return { squadre: squadre.length, giocatori };
}

// ---- Tabellini ----

export interface DiffTabellini {
  candidate: number;
  sincronizzate: number;
  righeScritte: number;
  giocatoriNuovi: number;
  partiteFallite: number[];
}

// Le partite del club di casa giocate ma senza tabellino.
async function partiteSenzaTabellino(limite: number) {
  return db
    .select({
      id: matches.id,
      lbaMatchId: matches.lbaMatchId,
      manualOverride: matches.manualOverride,
    })
    .from(matches)
    .where(
      and(
        eq(matches.status, "finished"),
        isNull(matches.quarterScores),
        sql`exists (
          select 1 from team_seasons ts
          join clubs c on c.id = ts.club_id and c.is_home_club
          where ts.id in (${matches.homeTeamSeasonId}, ${matches.awayTeamSeasonId})
        )`,
        sql`not exists (
          select 1 from player_match_stats pms where pms.match_id = ${matches.id}
        )`,
      ),
    )
    .orderBy(matches.startsAt)
    .limit(limite);
}

export async function sincronizzaTabellini(
  limite = 10,
  pausaMs = 400,
): Promise<DiffTabellini> {
  const candidate = await partiteSenzaTabellino(limite);
  const diff: DiffTabellini = {
    candidate: candidate.length,
    sincronizzate: 0,
    righeScritte: 0,
    giocatoriNuovi: 0,
    partiteFallite: [],
  };

  for (const partita of candidate) {
    if (!partita.lbaMatchId) continue;
    try {
      const tabellino = await getTabellino(partita.lbaMatchId);
      if (tabellino.righe.length === 0) continue; // non ancora pubblicato

      // Gli avversari entrano in players come sola anagrafica: DoNothing
      // così i dati ricchi del roster non vengono mai degradati.
      const idLba = tabellino.righe.map((r) => r.lbaPlayerId);
      const nuovi = await db
        .insert(players)
        .values(
          tabellino.righe.map((r) => ({
            lbaPlayerId: r.lbaPlayerId,
            firstName: r.firstName,
            lastName: r.lastName,
            photoKey: r.photoKey,
          })),
        )
        .onConflictDoNothing({ target: players.lbaPlayerId })
        .returning({ id: players.id });
      diff.giocatoriNuovi += nuovi.length;

      const righeGiocatori = await db
        .select({ id: players.id, lbaPlayerId: players.lbaPlayerId })
        .from(players)
        .where(inArray(players.lbaPlayerId, idLba));
      const mappaGiocatori = new Map(righeGiocatori.map((r) => [r.lbaPlayerId, r.id]));

      for (const r of tabellino.righe) {
        const playerId = mappaGiocatori.get(r.lbaPlayerId);
        if (!playerId) continue;
        await db
          .insert(playerMatchStats)
          .values({
            matchId: partita.id,
            playerId,
            starter: r.starter,
            minutes: String(r.minutes),
            points: r.points,
            fg2m: r.fg2m,
            fg2a: r.fg2a,
            fg3m: r.fg3m,
            fg3a: r.fg3a,
            ftm: r.ftm,
            fta: r.fta,
            dunks: r.dunks,
            rebOff: r.rebOff,
            rebDef: r.rebDef,
            assists: r.assists,
            steals: r.steals,
            turnovers: r.turnovers,
            blocks: r.blocks,
            blocksReceived: r.blocksReceived,
            foulsCommitted: r.foulsCommitted,
            foulsReceived: r.foulsReceived,
            plusMinus: r.plusMinus,
            rating: String(r.rating),
            oer: String(r.oer),
          })
          .onConflictDoUpdate({
            target: [playerMatchStats.matchId, playerMatchStats.playerId],
            set: {
              starter: r.starter,
              minutes: String(r.minutes),
              points: r.points,
              fg2m: r.fg2m,
              fg2a: r.fg2a,
              fg3m: r.fg3m,
              fg3a: r.fg3a,
              ftm: r.ftm,
              fta: r.fta,
              dunks: r.dunks,
              rebOff: r.rebOff,
              rebDef: r.rebDef,
              assists: r.assists,
              steals: r.steals,
              turnovers: r.turnovers,
              blocks: r.blocks,
              blocksReceived: r.blocksReceived,
              foulsCommitted: r.foulsCommitted,
              foulsReceived: r.foulsReceived,
              plusMinus: r.plusMinus,
              rating: String(r.rating),
              oer: String(r.oer),
            },
            setWhere: sql`${playerMatchStats.manualOverride} = false`,
          });
        diff.righeScritte++;
      }

      // Parziali e punteggio finale dal tabellino (più autorevole del
      // calendario), rispettando il manual override.
      if (!partita.manualOverride) {
        await db
          .update(matches)
          .set({
            quarterScores: tabellino.parziali,
            additionalTime: tabellino.additionalTime,
            homeScore: tabellino.homeScore,
            awayScore: tabellino.awayScore,
            lastSyncedAt: new Date(),
          })
          .where(eq(matches.id, partita.id));
      }

      diff.sincronizzate++;
    } catch (err) {
      console.warn(`Tabellino ${partita.lbaMatchId} fallito:`, err);
      diff.partiteFallite.push(partita.lbaMatchId);
    }
    // Cache rispettosa (regola 6): poche chiamate, distanziate.
    if (pausaMs > 0) await new Promise((r) => setTimeout(r, pausaMs));
  }

  return diff;
}

// ---- Stagione intera (usata dal seed) ----

export async function sincronizzaStagione(anno: number, homeClubLbaId: number) {
  console.log(`\n=== Stagione ${anno}-${anno + 1} ===`);

  const competizioni = await getCompetizioniStagione(anno);
  await segnalaTypeCodeSconosciuti(competizioni);
  console.log(`  Competizioni sulla fonte: ${competizioni.length}`);

  const squadre = await getSquadreStagione(anno);
  const mappaSquadre = await riconciliaSquadre(squadre, homeClubLbaId);
  console.log(`  Squadre-stagione: ${squadre.length}`);

  const squadraCasa = squadre.find((s) => s.lbaClubId === homeClubLbaId);
  if (squadraCasa) {
    const { giocatori } = await sincronizzaRoster(
      squadraCasa,
      mappaSquadre.get(squadraCasa.lbaTeamId)!,
    );
    if (giocatori > 0) {
      console.log(`  Roster ${squadraCasa.displayName}: ${giocatori} giocatori`);
    }
  } else {
    console.warn(`  Nessuna squadra con club LBA ${homeClubLbaId} nella stagione ${anno}`);
  }

  for (const c of competizioni) {
    try {
      const diff = await sincronizzaCalendarioCompetizione(c, mappaSquadre);
      if (!diff) {
        console.log(`  "${c.name}": altra serie, scartata`);
        continue;
      }
      console.log(
        `  Calendario "${c.name}": ${diff.totali - diff.saltate} partite` +
          (diff.saltate > 0 ? ` (${diff.saltate} non riconciliate, saltate)` : ""),
      );
    } catch (err) {
      console.warn(`  Calendario "${c.name}" non disponibile:`, err);
    }
  }
}
