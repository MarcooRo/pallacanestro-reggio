// Regole di dominio del voto (PROJECT_RE.md, sezione 4).
// Funzioni pure: le applica la server action, il client le mostra soltanto.

// Il podio è ordinato (PROJECT_RE.md sezione 4, scelta del 03/08/2026):
// prima secondo e terzo valevano 1 punto pari.
export const PUNTI_BEST = 3;
export const PUNTI_SECONDO = 2;
export const PUNTI_TERZO = 1;

// Punti accreditati in points_ledger per aver votato (gamification minima
// di v1; la formula può cambiare, il ledger permette il ricalcolo).
export const PUNTI_VOTO_ESPRESSO = 10;

export const ORE_FINESTRA_DEFAULT = 24;

/**
 * Le colonne di `votes` conservano i nomi storici: `optionalAId` è il
 * SECONDO del podio, `optionalBId` il TERZO. Non sono interscambiabili —
 * pesano 2 e 1 punto.
 */
export interface ScelteVoto {
  bestPlayerId: string;
  optionalAId: string | null;
  optionalBId: string | null;
  favoritePlayerId: string | null;
}

// La finestra è aperta solo se lo stato è 'open' E la scadenza non è passata:
// lo stato da solo non basta, la chiusura automatica non è una dipendenza.
export function finestraAperta(
  partita: { votingState: string; votingClosesAt: Date | null },
  adesso: Date,
): boolean {
  return (
    partita.votingState === "open" &&
    partita.votingClosesAt !== null &&
    adesso < partita.votingClosesAt
  );
}

// Ritorna il messaggio d'errore, o null se le scelte sono valide.
export function validaScelte(
  scelte: ScelteVoto,
  votabili: ReadonlySet<string>,
): string | null {
  const { bestPlayerId, optionalAId, optionalBId, favoritePlayerId } = scelte;

  if (!bestPlayerId) return "Il migliore in campo è obbligatorio";

  // I tre gradini del podio sono tre giocatori distinti.
  // Il Preferito può coincidere: prestazione e affetto sono domande diverse.
  if (optionalAId && optionalAId === bestPlayerId)
    return "Secondo e terzo devono essere diversi dal migliore";
  if (optionalBId && optionalBId === bestPlayerId)
    return "Secondo e terzo devono essere diversi dal migliore";
  if (optionalAId && optionalBId && optionalAId === optionalBId)
    return "Secondo e terzo devono essere due giocatori diversi";

  for (const id of [bestPlayerId, optionalAId, optionalBId, favoritePlayerId]) {
    if (id && !votabili.has(id)) {
      return "Uno dei giocatori scelti non è votabile per questa partita";
    }
  }

  return null;
}
