// Calcolo della pagella aggregata: da voti individuali a vote_tallies.
// Funzione pura, testabile: la server action la usa dentro una transazione.

import {
  PUNTI_BEST,
  PUNTI_SECONDO,
  PUNTI_TERZO,
  type ScelteVoto,
} from "@/src/lib/voto/regole";

export interface RigaTally {
  playerId: string;
  bestCount: number;
  secondCount: number;
  thirdCount: number;
  /** Secondi + terzi. Resta perché ci si appoggia la vista delle classifiche
   *  (v_leaderboard_performance) e la versione ancora in produzione. */
  supportCount: number;
  performancePoints: number;
  favoriteCount: number;
}

export function calcolaTally(voti: ScelteVoto[]): RigaTally[] {
  const righe = new Map<string, RigaTally>();

  const riga = (playerId: string): RigaTally => {
    let r = righe.get(playerId);
    if (!r) {
      r = {
        playerId,
        bestCount: 0,
        secondCount: 0,
        thirdCount: 0,
        supportCount: 0,
        performancePoints: 0,
        favoriteCount: 0,
      };
      righe.set(playerId, r);
    }
    return r;
  };

  for (const voto of voti) {
    riga(voto.bestPlayerId).bestCount++;
    // optionalA = secondo, optionalB = terzo: non sono interscambiabili.
    if (voto.optionalAId) riga(voto.optionalAId).secondCount++;
    if (voto.optionalBId) riga(voto.optionalBId).thirdCount++;
    if (voto.favoritePlayerId) riga(voto.favoritePlayerId).favoriteCount++;
  }

  for (const r of righe.values()) {
    r.supportCount = r.secondCount + r.thirdCount;
    r.performancePoints =
      r.bestCount * PUNTI_BEST +
      r.secondCount * PUNTI_SECONDO +
      r.thirdCount * PUNTI_TERZO;
  }

  // Ordinamento pagella: più punti, poi più Best, poi più secondi, poi più
  // voti in tutto.
  return [...righe.values()].sort(
    (a, b) =>
      b.performancePoints - a.performancePoints ||
      b.bestCount - a.bestCount ||
      b.secondCount - a.secondCount ||
      b.bestCount + b.supportCount - (a.bestCount + a.supportCount),
  );
}
