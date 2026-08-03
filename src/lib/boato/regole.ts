// Regole del boato (idea approvata il 03/08/2026). Funzioni pure: le usano
// la server action, la rotta di lettura e il client, così la scala dell'onda
// è la stessa da tutte le parti.

/** Granularità della curva. 10s: sotto si vedrebbe solo rumore. */
export const BUCKET_MS = 10_000;

/** Ogni quanto il client manda i tap accumulati. */
export const INTERVALLO_INVIO_MS = 5_000;

/**
 * Tetto per invio: ~12 tap al secondo su 5 secondi è già oltre l'umano.
 * Serve a limitare il danno di uno script, non a rendere il boato
 * inattaccabile: è un termometro di piazza, non una votazione.
 */
export const TAP_MASSIMI_PER_INVIO = 60;

/** Quanti bucket mostra l'onda a schermo (30 × 10s = 5 minuti). */
export const BUCKET_ONDA = 30;

/** Finestra in cui il boato è vivo, come per il polling della diretta. */
export const ANTICIPO_MS = 15 * 60_000;
export const DURATA_MASSIMA_MS = 3 * 60 * 60_000;

export interface Bucket {
  /** ISO: attraversa il confine server → client */
  bucketStart: string;
  taps: number;
  bursts: number;
}

/** Inizio del bucket che contiene l'istante dato. Lo decide il server. */
export function inizioBucket(adesso: Date): Date {
  return new Date(Math.floor(adesso.getTime() / BUCKET_MS) * BUCKET_MS);
}

export function tapAmmessi(taps: number): number {
  if (!Number.isFinite(taps)) return 0;
  return Math.max(0, Math.min(Math.floor(taps), TAP_MASSIMI_PER_INVIO));
}

export function finestraBoatoAperta(
  partita: { startsAt: Date; status: string },
  adesso: Date,
): boolean {
  if (partita.status === "postponed" || partita.status === "cancelled") return false;
  // A gara archiviata la curva si guarda, non si alimenta più.
  if (partita.status === "finished") return false;
  const inizio = partita.startsAt.getTime();
  const ora = adesso.getTime();
  return ora >= inizio - ANTICIPO_MS && ora <= inizio + DURATA_MASSIMA_MS;
}

/**
 * L'onda da disegnare: gli ultimi `quanti` bucket fino a `fine`, con i buchi
 * riempiti a zero (il silenzio è un dato) e i valori normalizzati sul picco
 * della partita — così l'altezza dice "quanto rispetto al massimo di stasera"
 * e non dipende da quanti tifosi sono collegati.
 */
export function normalizzaOnda(
  buckets: readonly Bucket[],
  picco: number,
  fine: Date,
  quanti = BUCKET_ONDA,
): number[] {
  const perIstante = new Map<number, number>();
  for (const b of buckets) {
    perIstante.set(new Date(b.bucketStart).getTime(), b.taps);
  }

  const ultimo = inizioBucket(fine).getTime();
  const scala = picco > 0 ? picco : 1;
  const onda: number[] = [];
  for (let i = quanti - 1; i >= 0; i--) {
    const taps = perIstante.get(ultimo - i * BUCKET_MS) ?? 0;
    onda.push(Math.min(1, taps / scala));
  }
  return onda;
}
