// Tipi condivisi del modulo OG. Vivono qui e non nel registry per non
// creare un ciclo: i template importano il tipo, il registry importa i
// template.

import type { ReactElement } from "react";
import type { z } from "zod";

// Le uniche dimensioni ammesse: definite qui, mai nei componenti.
export const DIMENSIONI = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
} as const;

export type NomeFormato = keyof typeof DIMENSIONI;

export interface TemplateOg<P = unknown> {
  nome: string;
  /** Per l'AI che sceglie il template: cosa rappresenta e quando usarlo */
  descrizione: string;
  formato: NomeFormato;
  schema: z.ZodType<P>;
  /** Parametri d'esempio validi, mostrati da list_og_templates */
  esempio: P;
  render: (params: P) => ReactElement;
}

export function dimensioniTemplate(t: { formato: NomeFormato }): {
  width: number;
  height: number;
} {
  return DIMENSIONI[t.formato];
}
