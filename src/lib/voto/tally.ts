// Calcolo della pagella aggregata: da voti individuali a vote_tallies.
// Funzione pura, testabile: la server action la usa dentro una transazione.

import { PUNTI_BEST, PUNTI_SUPPORT, type ScelteVoto } from "@/src/lib/voto/regole";

export interface RigaTally {
  playerId: string;
  bestCount: number;
  supportCount: number;
  performancePoints: number;
  favoriteCount: number;
}

export function calcolaTally(voti: ScelteVoto[]): RigaTally[] {
  const righe = new Map<string, RigaTally>();

  const riga = (playerId: string): RigaTally => {
    let r = righe.get(playerId);
    if (!r) {
      r = { playerId, bestCount: 0, supportCount: 0, performancePoints: 0, favoriteCount: 0 };
      righe.set(playerId, r);
    }
    return r;
  };

  for (const voto of voti) {
    riga(voto.bestPlayerId).bestCount++;
    if (voto.optionalAId) riga(voto.optionalAId).supportCount++;
    if (voto.optionalBId) riga(voto.optionalBId).supportCount++;
    if (voto.favoritePlayerId) riga(voto.favoritePlayerId).favoriteCount++;
  }

  for (const r of righe.values()) {
    r.performancePoints = r.bestCount * PUNTI_BEST + r.supportCount * PUNTI_SUPPORT;
  }

  // Ordinamento pagella: più punti, poi più Best, poi più voti totali.
  return [...righe.values()].sort(
    (a, b) =>
      b.performancePoints - a.performancePoints ||
      b.bestCount - a.bestCount ||
      b.bestCount + b.supportCount - (a.bestCount + a.supportCount),
  );
}
