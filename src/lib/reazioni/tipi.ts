// Le reazioni al risultato. Set PROVVISORIO: quali reazioni tenere è una
// decisione aperta, e cambiarle è un'edit di questo file — match_reactions.kind
// è text senza check constraint proprio per non passare da una migrazione.
//
// Criterio di scelta: devono funzionare sia dopo una vittoria sia dopo una
// sconfitta, altrimenti metà delle partite non ha una reazione sensata.

export interface Reazione {
  code: string;
  emoji: string;
  etichetta: string;
}

export const REAZIONI: readonly Reazione[] = [
  { code: "fuoco", emoji: "🔥", etichetta: "Che partita" },
  { code: "orgoglio", emoji: "❤️", etichetta: "Orgoglio" },
  { code: "incredulo", emoji: "😱", etichetta: "Non ci credo" },
  { code: "amaro", emoji: "😤", etichetta: "Che rabbia" },
];

const codici = new Set(REAZIONI.map((r) => r.code));

export function reazioneValida(code: string): boolean {
  return codici.has(code);
}

/** Conteggi aggregati per codice: l'unica cosa che il pubblico legge. */
export type ConteggiReazioni = Record<string, number>;
