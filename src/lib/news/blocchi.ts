// Il corpo di un articolo nostro: blocchi tipizzati, non HTML. Stesso
// principio delle forme delle slide social (src/lib/social/forme.ts) —
// lo schema è la fonte di verità, condiviso tra layer MCP e rendering,
// così l'AI non può mai far arrivare markup in pagina.
//
// Il blocco "grafico" fa eccezione solo in apparenza: porta un nome e dei
// parametri opachi, validati a runtime dal registry (src/lib/news/grafici).
// Il registry NON si importa qui — questo file è tipo condiviso con
// src/db/schema.ts, e tirarci dentro componenti React e query chiuderebbe
// un ciclo di import.

import { z } from "zod";

import { testoPiano } from "@/src/lib/news/markdown";

const testo = z.string().trim().min(1).max(2000);

export const bloccoSchema = z.discriminatedUnion("t", [
  z.strictObject({
    t: z.literal("paragrafo"),
    testo: testo.describe("Un paragrafo di testo semplice, senza markup"),
  }),
  // Il blocco per scrivere lungo: stesso testo del paragrafo ma con la
  // formattazione che serve davvero (enfasi, link, sottotitoli, elenchi).
  // Il markdown NON diventa mai HTML: si analizza in nodi React, e un tag
  // scritto nel testo resta testo visibile.
  z.strictObject({
    t: z.literal("md"),
    testo: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .describe(
        "Markdown, sottoinsieme sicuro: **grassetto**, _corsivo_, `codice`, [testo](url), ## e ### sottotitoli, - o 1. elenchi, > citazioni, --- riga. Nessun HTML: i tag restano testo",
      ),
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
    piena: z
      .boolean()
      .optional()
      .describe(
        "true = la foto esce dai margini del testo, da bordo a bordo. Per UNA foto forte dell'articolo, non per tutte",
      ),
  }),
  // Più foto in fila che si scorrono col dito: una sola unità visiva invece
  // di quattro immagini impilate che allungano la pagina.
  z.strictObject({
    t: z.literal("galleria"),
    assetIds: z
      .array(z.string().uuid())
      .min(2)
      .max(6)
      .describe("Da 2 a 6 foto della libreria (list_media), nell'ordine di scorrimento"),
    didascalia: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe("Una riga sotto il carosello: vale per tutte le foto"),
  }),
  // Il widget: non porta i numeri, porta il riferimento al dato. Chi legge
  // vede il dato vero al momento in cui apre la pagina, e l'AI non può
  // sbagliare una cifra perché non la scrive.
  z.strictObject({
    t: z.literal("grafico"),
    tipo: z.string().describe("Nome del widget, da list_article_blocks"),
    params: z
      .record(z.string(), z.unknown())
      .describe("Parametri del widget: schema ed esempio validi in list_article_blocks"),
  }),
]);

export const corpoSchema = z
  .array(bloccoSchema)
  .min(1)
  .max(60)
  .describe("Il corpo dell'articolo, blocco per blocco nell'ordine di lettura");

export type Blocco = z.output<typeof bloccoSchema>;

/** Un articolo deve avere qualcosa da leggere, non solo widget e foto. */
export function haParagrafi(corpo: Blocco[]): boolean {
  return corpo.some((b) => b.t === "paragrafo" || b.t === "md" || b.t === "citazione");
}

/** Battute del solo testo leggibile: serve al tempo di lettura e all'admin. */
export function numeroParole(corpo: Blocco[]): number {
  const parti = corpo.flatMap((b) => {
    if (b.t === "elenco") return b.voci;
    // Immagini e widget non hanno testo: contarli darebbe "undefined" per parola
    if (b.t === "immagine" || b.t === "galleria") {
      return b.didascalia ? [b.didascalia] : [];
    }
    if (b.t === "grafico") return [];
    // Nel markdown si contano le parole, non i segni di formattazione
    if (b.t === "md") return [testoPiano(b.testo)];
    return [b.testo];
  });
  return parti.join(" ").split(/\s+/).filter(Boolean).length;
}

/** Le foto citate nel corpo, nell'ordine, senza doppioni (galleria compresa). */
export function assetIdsDelCorpo(corpo: Blocco[]): string[] {
  const visti = new Set<string>();
  for (const b of corpo) {
    if (b.t === "immagine") visti.add(b.assetId);
    if (b.t === "galleria") for (const id of b.assetIds) visti.add(id);
  }
  return [...visti];
}

/** I widget del corpo con la loro posizione: la posizione è la chiave con
 *  cui i dati risolti tornano al rendering (src/lib/news/grafici/dati.ts). */
export function graficiDelCorpo(
  corpo: Blocco[],
): { indice: number; tipo: string; params: Record<string, unknown> }[] {
  return corpo.flatMap((b, indice) =>
    b.t === "grafico" ? [{ indice, tipo: b.tipo, params: b.params }] : [],
  );
}

// Tetto alle foto dentro un articolo: oltre si fanno pagine da megabyte
// su una connessione da palazzetto.
export const MAX_IMMAGINI_CORPO = 10;

// Tetto ai widget: ognuno è una query in più a comporre la pagina.
export const MAX_GRAFICI_CORPO = 6;
