// Regole di dominio dei pronostici (PROJECT_RE.md, sezione 5).
// Funzioni pure: le applica la server action, il client le mostra soltanto.
//
// Le domande sono libere e diverse ogni giornata ("quanti punti nel primo
// quarto?", "chi prende il primo rimbalzo?"): per questo il tipo è `open` con
// opzioni scritte a mano e risoluzione dell'admin. Il vocabolario chiuso
// (match_result, over_under…) resta in schema per le risoluzioni automatiche
// di domani, ma qui non serve.

export const PUNTI_BASE_PRONOSTICO = 10;

/**
 * Tetto del moltiplicatore Visionario. Senza tetto, indovinare una risposta
 * scelta da una persona sola vale quanto tutta la stagione.
 */
export const MOLTIPLICATORE_MASSIMO = 3;

export const MIN_OPZIONI = 2;
export const MAX_OPZIONI = 6;
export const MAX_LUNGHEZZA_DOMANDA = 140;
export const MAX_LUNGHEZZA_OPZIONE = 60;

export interface Pronostico {
  status: string;
  closesAt: Date;
}

/**
 * La forma che arriva al client. Sta qui e non in queries.ts perché la usa
 * anche il componente: importare da queries.ts trascinerebbe il driver del
 * database nel bundle del browser.
 */
export interface PronosticoPubblico {
  id: string;
  question: string;
  opzioni: string[];
  status: string;
  closesAt: Date;
  /** Indice della risposta corretta, quando è stato risolto */
  corretta: number | null;
  /** La risposta di chi guarda, null se non ha risposto o non è loggato */
  mia: number | null;
  /** Quante risposte per indice di opzione */
  distribuzione: number[];
  totale: number;
}

/**
 * La distribuzione si mostra a chi ha già risposto (o a pronostico chiuso):
 * vedere le percentuali prima di scegliere sposterebbe il voto e renderebbe
 * il dato inutile.
 */
export function distribuzioneVisibile(p: PronosticoPubblico): boolean {
  return p.mia !== null || p.status !== "open";
}

/** Si risponde solo a pronostico aperto E prima della chiusura. */
export function pronosticoAperto(p: Pronostico, adesso: Date): boolean {
  return p.status === "open" && adesso < p.closesAt;
}

/**
 * Punti "Visionario": base per la risposta corretta, moltiplicata per
 * l'inverso della popolarità di quella risposta. Indovinare ciò che ha
 * scelto il 5% vale più di indovinare ciò che ha scelto il 90%.
 *
 * `quanteCorrette` è quante persone hanno dato la risposta poi risultata
 * giusta, `totale` quante hanno risposto in tutto.
 */
export function puntiVisionario(quanteCorrette: number, totale: number): number {
  if (quanteCorrette <= 0 || totale <= 0) return 0;
  const quota = quanteCorrette / totale;
  const moltiplicatore = Math.min(MOLTIPLICATORE_MASSIMO, 1 / quota);
  return Math.round(PUNTI_BASE_PRONOSTICO * moltiplicatore);
}

/**
 * Le opzioni di una domanda: si ripuliscono, si scartano i doppioni e i
 * vuoti. Ritorna il messaggio d'errore, o le opzioni valide.
 */
export function validaOpzioni(
  grezze: readonly string[],
): { errore: string } | { opzioni: string[] } {
  const opzioni: string[] = [];
  for (const voce of grezze) {
    const pulita = voce.trim().slice(0, MAX_LUNGHEZZA_OPZIONE);
    if (!pulita) continue;
    if (opzioni.some((o) => o.toLowerCase() === pulita.toLowerCase())) continue;
    opzioni.push(pulita);
  }
  if (opzioni.length < MIN_OPZIONI) {
    return { errore: `Servono almeno ${MIN_OPZIONI} risposte diverse` };
  }
  if (opzioni.length > MAX_OPZIONI) {
    return { errore: `Non più di ${MAX_OPZIONI} risposte` };
  }
  return { opzioni };
}

/** Le opzioni salvate in jsonb: si validano in lettura, come tutto il jsonb. */
export function leggiOpzioni(valore: unknown): string[] {
  if (!Array.isArray(valore)) return [];
  return valore.filter((v): v is string => typeof v === "string");
}

/** L'indice scelto, salvato come {"opzione": n}. */
export function leggiScelta(valore: unknown): number | null {
  if (!valore || typeof valore !== "object") return null;
  const indice = (valore as Record<string, unknown>).opzione;
  return typeof indice === "number" && Number.isInteger(indice) ? indice : null;
}

export function scelta(indice: number) {
  return { opzione: indice };
}
