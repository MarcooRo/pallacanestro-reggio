// I dati dei widget, letti quando la pagina si compone — stessa logica
// delle foto del corpo (src/lib/news/immagini.ts): il blocco porta un
// riferimento, il valore si risolve qui, in un posto solo, e vale sia per
// /news/[slug] sia per l'anteprima in /admin/news/[id].
//
// La chiave è la posizione del blocco nel corpo: il rendering scorre lo
// stesso array con lo stesso indice, quindi non serve inventare un id.

import {
  graficiDelCorpo,
  MAX_GRAFICI_CORPO,
  type Blocco,
} from "@/src/lib/news/blocchi";
import { validaGrafico } from "@/src/lib/news/grafici/registry";
import { ErroreTool } from "@/src/lib/social/errore";

export interface GraficoRisolto {
  tipo: string;
  /** Parametri già passati dallo schema del widget. */
  params: unknown;
  /** Il dato letto dal database, o null se non c'è più: il blocco si salta. */
  dati: unknown;
}

export type DatiGrafici = Record<number, GraficoRisolto>;

export async function risolviGrafici(corpo: Blocco[] | null): Promise<DatiGrafici> {
  if (!corpo) return {};
  const blocchi = graficiDelCorpo(corpo);
  if (blocchi.length === 0) return {};

  // In parallelo: sono query indipendenti, e sono poche per costruzione
  const risolti = await Promise.all(
    blocchi.map(async ({ indice, tipo, params }) => {
      // Un widget tolto dal registry, o parametri che non passano più lo
      // schema, non devono buttare giù la pagina di un articolo già online.
      try {
        const { def, params: puliti } = validaGrafico(tipo, params, indice + 1);
        const dati = def.carica ? await def.carica(puliti) : undefined;
        return [indice, { tipo, params: puliti, dati }] as const;
      } catch {
        return [indice, { tipo, params, dati: null }] as const;
      }
    }),
  );

  return Object.fromEntries(risolti);
}

/**
 * Controllo alla scrittura: i widget esistono, i parametri sono validi e i
 * riferimenti puntano a qualcosa di vero. È l'unica rete — i blocchi stanno
 * in un jsonb, nessuna foreign key li protegge.
 */
export async function controllaGrafici(corpo: Blocco[]): Promise<void> {
  const blocchi = graficiDelCorpo(corpo);
  if (blocchi.length > MAX_GRAFICI_CORPO) {
    throw new ErroreTool(
      `Troppi widget nel corpo: ${blocchi.length}, il massimo è ${MAX_GRAFICI_CORPO}. Un articolo si legge, i widget lo puntellano.`,
    );
  }
  for (const { indice, tipo, params } of blocchi) {
    const { def, params: puliti } = validaGrafico(tipo, params, indice + 1);
    if (def.verifica) await def.verifica(puliti);
  }
}
