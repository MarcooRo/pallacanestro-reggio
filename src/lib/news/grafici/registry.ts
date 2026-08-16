// La fonte di verità sui widget d'articolo: nome, descrizione, schema Zod
// dei parametri, esempi. Sia l'MCP (list_article_blocks) sia il rendering
// leggono da qui: l'elenco non va duplicato da nessun'altra parte.
//
// Aggiungere un widget = un file in templates/ e una riga qui. Il blocco
// {t:'grafico'} in src/lib/news/blocchi.ts non cambia: è di proposito
// generico, così lo schema del corpo non sa nulla dei singoli widget e
// non si porta dietro React e query dentro src/db/schema.ts.

import { z } from "zod";

import { numeriChiave } from "./templates/numeri-chiave";
import { tabellinoPartita } from "./templates/tabellino";
import type { GraficoArticolo } from "./tipi";
import { ErroreTool } from "@/src/lib/social/errore";

// Il registry cancella il tipo dei parametri: ogni widget resta tipato nel
// suo file, i consumatori validano con lo schema prima di render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GRAFICI: Record<string, GraficoArticolo<any, any>> = {
  [numeriChiave.nome]: numeriChiave,
  [tabellinoPartita.nome]: tabellinoPartita,
};

export function getGrafico(nome: string): GraficoArticolo | null {
  return GRAFICI[nome] ?? null;
}

export function nomiGrafici(): string[] {
  return Object.keys(GRAFICI);
}

export function tuttiGrafici(): GraficoArticolo[] {
  return Object.values(GRAFICI);
}

/**
 * Valida un blocco grafico e restituisce i parametri normalizzati. Gli
 * errori sono scritti per essere letti da chi ha sbagliato: cosa non va e
 * qual è la forma giusta.
 */
export function validaGrafico(
  tipo: string,
  params: unknown,
  posizione: number,
): { def: GraficoArticolo; params: unknown } {
  const def = getGrafico(tipo);
  if (!def) {
    throw new ErroreTool(
      `Il blocco ${posizione} usa il widget "${tipo}" che non esiste. Widget disponibili: ${nomiGrafici().join(", ")}. Usa list_article_blocks per gli schemi.`,
    );
  }
  const esito = def.schema.safeParse(params);
  if (!esito.success) {
    throw new ErroreTool(
      `Parametri non validi per il blocco ${posizione} (widget "${tipo}"):\n${z.prettifyError(esito.error)}\nEsempio valido:\n${JSON.stringify(def.esempio, null, 2)}`,
    );
  }
  return { def, params: esito.data };
}
