// Seed della Fase 1: competizioni, squadre-stagione, roster del club di casa
// e calendario, per la stagione corrente E quella precedente (PROJECT_RE.md,
// sezione 9). Due stagioni per due ragioni: la corrente può essere ancora
// vuota sulla fonte a inizio estate, e solo con due stagioni si vede che il
// modello club/team_season regge davvero (sezione 7.1).
// Idempotente: si può rieseguire quando la fonte pubblica nuovi dati.
//
// Uso: bun run seed [anno ...]   (default: stagione corrente e precedente;
//      env da .env.local; richiede HOME_CLUB_LBA_ID)

import { sql } from "drizzle-orm";

import { db } from "@/src/db";
import {
  ingestionRuns,
  matches,
  players,
  playerStints,
  competitions as tabCompetizioni,
} from "@/src/db/schema";
import type {
  CompetizioneCanonica,
  SquadraStagioneCanonica,
} from "@/src/ingestion/normalize";
import { riconciliaSquadre } from "@/src/ingestion/reconcile";
import {
  getCalendario,
  getCompetizioniCorrenti,
  getCompetizioniStagione,
  getRoster,
  getSquadreStagione,
  TYPE_CODE_VERIFICATI,
} from "@/src/ingestion/sources/lba";

// Un type_code mai visto non deve passare in silenzio: si registra come
// run 'partial' e lo si scopre dal log, non da una classifica che ignora
// una competizione.
async function segnalaTypeCodeSconosciuti(competizioni: CompetizioneCanonica[]) {
  const sconosciute = competizioni.filter((c) => !TYPE_CODE_VERIFICATI.has(c.typeCode));
  for (const c of sconosciute) {
    const nota = `type_code sconosciuto "${c.typeCode}" per championship ${c.lbaChampionshipId} (${c.name}): verificarlo e aggiungerlo a TYPE_CODE_VERIFICATI`;
    console.warn(nota);
    await db.insert(ingestionRuns).values({
      source: "lba",
      target: "competitions",
      status: "partial",
      finishedAt: new Date(),
      recordsSeen: competizioni.length,
      error: nota,
    });
  }
}

async function seedRosterCasa(
  squadraCasa: SquadraStagioneCanonica,
  teamSeasonId: string,
) {
  const { giocatori, permanenze } = await getRoster(squadraCasa.lbaTeamId);
  if (giocatori.length === 0) {
    console.warn(
      `Roster ${squadraCasa.displayName} ancora vuoto sulla fonte: rieseguire il seed più avanti.`,
    );
    return;
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
        target: [playerStints.playerId, playerStints.teamSeasonId, playerStints.startDate],
        set: {
          endDate: p.endDate,
          jerseyNumber: p.jerseyNumber,
          role: p.role,
          roleId: p.roleId,
          uefaRatio: p.uefaRatio,
        },
      });
  }
  console.log(`  Roster ${squadraCasa.displayName}: ${giocatori.length} giocatori`);
}

async function seedCalendario(
  competizione: CompetizioneCanonica,
  mappaSquadre: Map<number, string>,
) {
  const partite = await getCalendario(competizione.lbaChampionshipId);
  const mappabili = partite.filter(
    (p) => mappaSquadre.has(p.homeLbaTeamId) && mappaSquadre.has(p.awayLbaTeamId),
  );

  // Competizione di un'altra serie (es. giovanili): nessuna squadra
  // riconciliabile, non entra nel database. Filtro a runtime, niente
  // elenchi di serie o id scritti nel codice.
  if (partite.length > 0 && mappabili.length === 0) {
    console.log(`  "${competizione.name}": altra serie, scartata`);
    return;
  }

  const [rigaCompetizione] = await db
    .insert(tabCompetizioni)
    .values({
      lbaChampionshipId: competizione.lbaChampionshipId,
      seasonYear: competizione.seasonYear,
      seriesCode: competizione.seriesCode,
      typeCode: competizione.typeCode,
      name: competizione.name,
      logoKey: competizione.logoKey,
    })
    .onConflictDoUpdate({
      target: tabCompetizioni.lbaChampionshipId,
      set: { name: competizione.name, logoKey: competizione.logoKey },
    })
    .returning({ id: tabCompetizioni.id });

  for (const p of mappabili) {
    await db
      .insert(matches)
      .values({
        lbaMatchId: p.lbaMatchId,
        competitionId: rigaCompetizione.id,
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

  const scartate = partite.length - mappabili.length;
  console.log(
    `  Calendario "${competizione.name}": ${mappabili.length} partite` +
      (scartate > 0 ? ` (${scartate} con squadre non riconciliate, saltate)` : ""),
  );
}

async function seedStagione(anno: number, homeClubLbaId: number) {
  console.log(`\n=== Stagione ${anno}-${anno + 1} ===`);

  const competizioni = await getCompetizioniStagione(anno);
  await segnalaTypeCodeSconosciuti(competizioni);
  console.log(`  Competizioni sulla fonte: ${competizioni.length}`);

  // Mappa lba_team_id → team_season: si costruisce da get-teams a ogni
  // stagione, mai join sul club_code (sezione 7.2).
  const squadre = await getSquadreStagione(anno);
  const mappaSquadre = await riconciliaSquadre(squadre, homeClubLbaId);
  console.log(`  Squadre-stagione: ${squadre.length}`);

  const squadraCasa = squadre.find((s) => s.lbaClubId === homeClubLbaId);
  if (squadraCasa) {
    await seedRosterCasa(squadraCasa, mappaSquadre.get(squadraCasa.lbaTeamId)!);
  } else {
    console.warn(`  Nessuna squadra con club LBA ${homeClubLbaId} nella stagione ${anno}`);
  }

  for (const c of competizioni) {
    try {
      await seedCalendario(c, mappaSquadre);
    } catch (err) {
      // Last-known-good: un fetch fallito non sovrascrive e non blocca il resto.
      console.warn(`  Calendario "${c.name}" non disponibile:`, err);
    }
  }
}

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
    await seedStagione(anno, homeClubLbaId);
  }

  console.log("\nSeed completato.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
