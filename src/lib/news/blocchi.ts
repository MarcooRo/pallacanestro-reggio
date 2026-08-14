// Il corpo di un articolo nostro: blocchi tipizzati, non HTML. Stesso
// principio delle forme delle slide social (src/lib/social/forme.ts) —
// lo schema è la fonte di verità, condiviso tra layer MCP e rendering,
// così l'AI non può mai far arrivare markup in pagina.
//
// Quattro tipi bastano per un articolo: chi ne vuole un quinto lo aggiunge
// qui e nel componente, in un posto solo.

import { z } from "zod";

const testo = z.string().trim().min(1).max(2000);

export const bloccoSchema = z.discriminatedUnion("t", [
  z.strictObject({
    t: z.literal("paragrafo"),
    testo: testo.describe("Un paragrafo di testo semplice, senza markup"),
  }),
  z.strictObject({
    t: z.literal("sottotitolo"),
    testo: z.string().trim().min(1).max(120).describe("Titolo di sezione"),
  }),
  z.strictObject({
    t: z.literal("elenco"),
    voci: z.array(testo).min(2).max(20).describe("Punti dell'elenco"),
  }),
  z.strictObject({
    t: z.literal("citazione"),
    testo,
    chi: z.string().trim().max(80).optional().describe("Chi l'ha detta"),
  }),
]);

export const corpoSchema = z
  .array(bloccoSchema)
  .min(1)
  .max(60)
  .describe("Il corpo dell'articolo, blocco per blocco nell'ordine di lettura");

export type Blocco = z.output<typeof bloccoSchema>;

/** Un articolo deve avere qualcosa da leggere, non solo sottotitoli. */
export function haParagrafi(corpo: Blocco[]): boolean {
  return corpo.some((b) => b.t === "paragrafo" || b.t === "citazione");
}

/** Battute del solo testo leggibile: serve al tempo di lettura e all'admin. */
export function numeroParole(corpo: Blocco[]): number {
  const parti = corpo.flatMap((b) =>
    b.t === "elenco" ? b.voci : [b.testo],
  );
  return parti.join(" ").split(/\s+/).filter(Boolean).length;
}
