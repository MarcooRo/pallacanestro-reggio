// Tipi condivisi dei widget d'articolo. Vivono qui e non nel registry per
// non creare un ciclo: i template importano il tipo, il registry importa i
// template. Stessa forma del registry OG (src/lib/og/tipi.ts): un widget è
// nome + descrizione per l'AI + schema Zod + esempio + render.
//
// La differenza sta in "carica": un widget d'articolo può leggere il dato
// vero al momento in cui la pagina si compone. Il blocco salvato porta un
// riferimento (l'id di una partita), non i numeri — così l'articolo resta
// giusto anche se il dato si corregge dopo, e chi scrive non può sbagliare
// una cifra che non ha scritto.

import type { ReactNode } from "react";
import type { z } from "zod";

export interface GraficoArticolo<P = unknown, D = unknown> {
  nome: string;
  /** Per l'AI che sceglie il widget: cosa mostra e quando usarlo. */
  descrizione: string;
  schema: z.ZodType<P>;
  /** Parametri d'esempio validi, mostrati da list_article_blocks. */
  esempio: P;
  /**
   * Legge il dato dal database quando la pagina si compone. Assente = il
   * widget si disegna con i soli parametri. null = il dato non c'è più: il
   * blocco si salta invece di stampare una tabella vuota.
   */
  carica?: (params: P) => Promise<D | null>;
  /**
   * Controllo alla scrittura: deve lanciare ErroreTool con un messaggio che
   * spieghi cosa fare. È l'unica rete per i riferimenti dentro un jsonb —
   * un id inventato deve fermarsi qui, non diventare un buco in pagina.
   */
  verifica?: (params: P) => Promise<void>;
  render: (params: P, dati: D) => ReactNode;
}
