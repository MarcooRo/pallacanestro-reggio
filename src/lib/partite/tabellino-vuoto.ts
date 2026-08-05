// Il tabellino prima della palla a due: le due rose intere, tutte le
// statistiche a zero.
//
// Non è un dato inventato — è la tabella che si riempirà, mostrata vuota:
// così prima della gara si sa già chi può scendere in campo e la pagina non
// cambia forma quando la diretta inizia a portare i numeri veri. Le righe
// hanno la stessa forma di quelle del tabellino vero (RigaTabellino), così
// la tabella è letteralmente la stessa.
//
// Tutto dalla fonte via getRosterLive, niente scritture: le rose delle
// avversarie non si memorizzano (cfr. tabellino-live.ts). La fonte però
// pubblica le rose nuove solo a fine estate: da luglio a settembre si
// ripiega sulla rosa della stagione prima, dicendolo in chiaro (è la
// stessa scelta dei quintetti, cfr. quintetti.ts).

import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/src/db";
import { matches, players, teamSeasons } from "@/src/db/schema";
import type { RigaTabellino } from "@/src/lib/partite/queries";
import { getRosterLive } from "@/src/lib/squadre/queries";

export interface TabellinoVuoto {
  righe: RigaTabellino[];
  /** Anno della stagione da cui arrivano le rose, se non è quella della
      partita: la pagina lo deve scrivere, non spacciarlo per rosa attuale */
  stagionePrecedente: number | null;
}

export async function getTabellinoVuoto(
  matchId: string,
): Promise<TabellinoVuoto> {
  const vuoto: TabellinoVuoto = { righe: [], stagionePrecedente: null };

  const casa = alias(teamSeasons, "v_casa");
  const ospite = alias(teamSeasons, "v_ospite");

  const [partita] = await db
    .select({
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
  if (!partita) return vuoto;

  const [rosaCasa, rosaOspiti] = await Promise.all([
    rosaConRipiego(
      partita.casaClubId,
      partita.casaLbaTeamId,
      partita.seasonYear,
    ),
    rosaConRipiego(
      partita.ospitiClubId,
      partita.ospitiLbaTeamId,
      partita.seasonYear,
    ),
  ]);
  if (rosaCasa.giocatori.length === 0 && rosaOspiti.giocatori.length === 0) {
    return vuoto;
  }

  // La scheda giocatore esiste solo per chi è già nel nostro archivio: per
  // gli altri la riga resta senza link, come quelle lette al volo.
  const nostri = await schedeGiocatori([
    ...rosaCasa.giocatori,
    ...rosaOspiti.giocatori,
  ]);

  return {
    righe: [
      ...rosaCasa.giocatori.map((g) => riga(g, "home", nostri)),
      ...rosaOspiti.giocatori.map((g) => riga(g, "away", nostri)),
    ],
    // Se una sola delle due ha ripiegato, vale comunque l'avviso: la
    // tabella non è tutta della stagione in corso.
    stagionePrecedente: Math.max(
      rosaCasa.stagione ?? 0,
      rosaOspiti.stagione ?? 0,
    ) || null,
  };
}

type Rosa = Awaited<ReturnType<typeof getRosterLive>>[number];

// La rosa della squadra-stagione della partita; se la fonte non l'ha ancora
// pubblicata, quella dell'ultima stagione dello stesso club.
async function rosaConRipiego(
  clubId: string,
  // null per le avversarie di coppa (BCL): la fonte LBA non le conosce,
  // il loro lato della tabella resta vuoto
  lbaTeamId: number | null,
  seasonYear: number,
): Promise<{ giocatori: Rosa[]; stagione: number | null }> {
  if (!lbaTeamId) return { giocatori: [], stagione: null };
  const attuale = await getRosterLive(lbaTeamId);
  if (attuale.length > 0) return { giocatori: attuale, stagione: null };

  const [precedente] = await db
    .select({
      lbaTeamId: teamSeasons.lbaTeamId,
      seasonYear: teamSeasons.seasonYear,
    })
    .from(teamSeasons)
    .where(
      and(
        eq(teamSeasons.clubId, clubId),
        lt(teamSeasons.seasonYear, seasonYear),
      ),
    )
    .orderBy(desc(teamSeasons.seasonYear))
    .limit(1);
  if (!precedente?.lbaTeamId) return { giocatori: [], stagione: null };

  const vecchia = await getRosterLive(precedente.lbaTeamId);
  return {
    giocatori: vecchia,
    stagione: vecchia.length > 0 ? precedente.seasonYear : null,
  };
}

async function schedeGiocatori(rose: Rosa[]): Promise<Map<number, string>> {
  const lbaIds = rose.map((g) => g.lbaPlayerId);
  if (lbaIds.length === 0) return new Map();

  const righe = await db
    .select({ id: players.id, lbaPlayerId: players.lbaPlayerId })
    .from(players)
    .where(inArray(players.lbaPlayerId, lbaIds));

  return new Map(
    righe.flatMap((r) => (r.lbaPlayerId ? [[r.lbaPlayerId, r.id]] : [])),
  );
}

// Zero, non null: "–" farebbe pensare a un dato che manca, mentre qui il
// dato c'è ed è zero perché la partita non è ancora cominciata.
function riga(
  g: Rosa,
  lato: "home" | "away",
  nostri: Map<number, string>,
): RigaTabellino {
  return {
    player_id: nostri.get(g.lbaPlayerId) ?? null,
    first_name: g.firstName,
    last_name: g.lastName,
    photo_key: g.photoKey,
    lato,
    starter: false,
    minutes: 0,
    points: 0,
    fg2m: 0,
    fg2a: 0,
    fg3m: 0,
    fg3a: 0,
    ftm: 0,
    fta: 0,
    reb_off: 0,
    reb_def: 0,
    assists: 0,
    steals: 0,
    turnovers: 0,
    fouls_committed: 0,
    rating: 0,
    plus_minus: 0,
  };
}
