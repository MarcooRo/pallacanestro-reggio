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
  // Solo l'id: url, dimensioni e alt si leggono dalla libreria quando la
  // pagina si compone (src/lib/news/immagini.ts). Così le misure sono quelle
  // vere — niente salto di layout — e non si duplica un dato che può
  // invecchiare.
  z.strictObject({
    t: z.literal("immagine"),
    assetId: z
      .string()
      .uuid()
      .describe("Foto della libreria, da list_media. Solo materiale nostro"),
    didascalia: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe("Riga sotto la foto: cosa si sta guardando"),
  }),
]);

export const corpoSchema = z
  .array(bloccoSchema)
  .min(1)
  .max(60)
  .describe("Il corpo dell'articolo, blocco per blocco nell'ordine di lettura");

export type Blocco = z.output<typeof bloccoSchema>;

/** Un articolo deve avere qualcosa da leggere, non solo sottotitoli e foto. */
export function haParagrafi(corpo: Blocco[]): boolean {
  return corpo.some((b) => b.t === "paragrafo" || b.t === "citazione");
}

/** Battute del solo testo leggibile: serve al tempo di lettura e all'admin. */
export function numeroParole(corpo: Blocco[]): number {
  const parti = corpo.flatMap((b) => {
    if (b.t === "elenco") return b.voci;
    // Le immagini non hanno testo: contarle darebbe "undefined" per parola
    if (b.t === "immagine") return b.didascalia ? [b.didascalia] : [];
    return [b.testo];
  });
  return parti.join(" ").split(/\s+/).filter(Boolean).length;
}

/** Le foto citate nel corpo, nell'ordine, senza doppioni. */
export function assetIdsDelCorpo(corpo: Blocco[]): string[] {
  const visti = new Set<string>();
  for (const b of corpo) if (b.t === "immagine") visti.add(b.assetId);
  return [...visti];
}

// Tetto alle foto dentro un articolo: oltre si fanno pagine da megabyte
// su una connessione da palazzetto.
export const MAX_IMMAGINI_CORPO = 10;
