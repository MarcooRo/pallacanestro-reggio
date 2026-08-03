// Tabellino "al volo" dalla fonte, per le partite non memorizzate:
// l'ingestion salva solo le gare di Reggio, per le altre si legge a
// render con la cache di Next (1h) senza scrivere nulla nel DB.
// player_id resta null: questi giocatori non hanno una scheda da noi.

import type { TabellinoCanonico } from "@/src/ingestion/normalize";
import { getTabellino } from "@/src/ingestion/sources/lba";
import type { RigaTabellino } from "@/src/lib/partite/queries";

// La conversione è condivisa con la rotta /api/live, che serve le stesse
// righe al client durante la partita: una sola mappatura, un solo posto
// da correggere se il vocabolario della fonte cambia.
export function versoRigheTabellino(
  tabellino: TabellinoCanonico,
): RigaTabellino[] {
  return tabellino.righe.map((r) => ({
    player_id: null,
    first_name: r.firstName,
    last_name: r.lastName,
    photo_key: r.photoKey,
    lato: r.lato,
    starter: r.starter,
    minutes: r.minutes,
    points: r.points,
    fg2m: r.fg2m,
    fg2a: r.fg2a,
    fg3m: r.fg3m,
    fg3a: r.fg3a,
    ftm: r.ftm,
    fta: r.fta,
    reb_off: r.rebOff,
    reb_def: r.rebDef,
    assists: r.assists,
    steals: r.steals,
    turnovers: r.turnovers,
    fouls_committed: r.foulsCommitted,
    rating: r.rating,
    plus_minus: r.plusMinus,
  }));
}

export async function getTabellinoLive(
  lbaMatchId: number,
): Promise<RigaTabellino[]> {
  try {
    return versoRigheTabellino(await getTabellino(lbaMatchId, 3600));
  } catch {
    // Fonte giù o gara senza tabellino: la sezione non compare, senza rompere.
    return [];
  }
}
