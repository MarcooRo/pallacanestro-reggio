// L'ordine con cui si schiera un quintetto: dalla regia ai lunghi. Vive
// fuori dalle query perché lo usano la pagina squadra (quintetto
// dell'ultima) e la pagina partita (i due quintetti in campo). Il
// vocabolario dei ruoli è quello della fonte ("Playmaker", "Guardia", …).

export const PRIORITA_RUOLO: Record<string, number> = {
  Playmaker: 0,
  "Play/Guardia": 1,
  Guardia: 2,
  Ala: 3,
  Centro: 4,
};

/** Ruolo sconosciuto in coda: il disegno del campo non deve mai mentire. */
export function ordinaPerRuolo<T extends { role: string | null }>(
  giocatori: readonly T[],
): T[] {
  return [...giocatori].sort(
    (a, b) =>
      (PRIORITA_RUOLO[a.role ?? ""] ?? 5) - (PRIORITA_RUOLO[b.role ?? ""] ?? 5),
  );
}
