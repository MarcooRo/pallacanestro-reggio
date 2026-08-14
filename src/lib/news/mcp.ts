// I tool MCP degli articoli nostri. Stessi guardrail strutturali della
// coda social, imposti qui nel codice e non solo nei tipi:
//
//   1. NON ESISTE un tool che pubblica, nemmeno dietro un flag.
//   2. Questo layer non scrive mai la colonna status: 'draft' e 'archived'
//      sono letterali dentro src/lib/news/redazione.ts. La transizione a
//      'published' vive solo nelle server action admin.
//   3. update_article tocca solo bozze, con errore esplicito altrimenti.
//
// La fonte di un articolo nostro è 'redazione': in pagina si legge
// "Redazione", distinta da "Pallacanestro Reggiana" che sono le news
// ufficiali del club. Nessun articolo può spacciarsi per comunicato.

import { z } from "zod";

import { corpoSchema, numeroParole } from "@/src/lib/news/blocchi";
import {
  aggiornaBozza,
  archiviaArticolo,
  creaBozza,
  elencaArticoli,
  ErroreArticolo,
  getArticolo,
  type Articolo,
} from "@/src/lib/news/redazione";
import { ErroreTool } from "@/src/lib/social/errore";

const STATI = ["draft", "published", "archived"] as const;

// ---------- input dei tool ----------

const testoBreve = z.string().trim().min(1);

const INPUT = {
  create_article: z.strictObject({
    title: testoBreve.max(140).describe("Titolo dell'articolo"),
    body: corpoSchema,
    excerpt: z
      .string()
      .trim()
      .max(300)
      .optional()
      .describe("Sommario: si vede nella lista e nelle condivisioni. Scrivilo sempre"),
    category: z
      .string()
      .trim()
      .max(40)
      .optional()
      .describe("Rubrica, es. Analisi, Editoriale, Mercato"),
    authorName: z
      .string()
      .trim()
      .max(60)
      .optional()
      .describe("Firma umana in testata. Se manca, resta la sola Redazione"),
    assetId: z
      .string()
      .uuid()
      .optional()
      .describe("Copertina dalla libreria foto (list_media). Solo materiale nostro"),
  }),
  list_articles: z.strictObject({
    status: z.enum(STATI).optional().describe("Senza filtro: prima le bozze"),
  }),
  get_article: z.strictObject({ id: z.string().uuid() }),
  update_article: z.strictObject({
    id: z.string().uuid(),
    title: testoBreve.max(140).optional().describe("Cambia anche l'indirizzo (slug)"),
    body: corpoSchema.optional().describe("Se presente SOSTITUISCE tutto il corpo"),
    excerpt: z.string().trim().max(300).nullable().optional(),
    category: z.string().trim().max(40).nullable().optional(),
    authorName: z.string().trim().max(60).nullable().optional(),
    assetId: z.string().uuid().nullable().optional().describe("null toglie la copertina"),
  }),
  archive_article: z.strictObject({ id: z.string().uuid() }),
} satisfies Record<string, z.ZodType>;

export const DESCRIZIONI_NEWS: Record<keyof typeof INPUT, string> = {
  create_article:
    "Scrive un articolo nostro e lo mette in bozza sul sito. Il corpo è fatto di blocchi (paragrafo, sottotitolo, elenco, citazione), non HTML. NON viene pubblicato: lo pubblica un umano da /admin/news, e in pagina comparirà la nota «Generato in parte con AI».",
  list_articles: "Elenca gli articoli nostri: prima le bozze in lavorazione, poi i pubblicati.",
  get_article: "Dettaglio completo di un articolo, corpo compreso.",
  update_article:
    "Corregge un articolo ANCORA in bozza: titolo, corpo, sommario, rubrica, firma, copertina. Dopo la pubblicazione non si tocca più da qui.",
  archive_article:
    "Archivia un articolo: se era pubblicato esce dal sito, se era una bozza esce dalla lista di lavoro.",
};

// ---------- esposizione ----------

type Contesto = { base: string };

function esponiArticolo(a: Articolo, base: string) {
  return {
    id: a.id,
    status: a.status,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category,
    authorName: a.authorName,
    imageUrl: a.imageUrl,
    assetId: a.assetId,
    parole: a.body ? numeroParole(a.body) : 0,
    publishedAt: a.publishedAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    isPinned: a.isPinned,
    adminUrl: `${base}/admin/news/${a.id}`,
    // Indirizzo pubblico: vale solo da pubblicato, prima è un 404
    urlPubblico: a.status === "published" ? `${base}/news/${a.slug}` : null,
  };
}

// ---------- i tool ----------

const TOOL: Record<
  keyof typeof INPUT,
  (input: never, ctx: Contesto) => Promise<unknown>
> = {
  async create_article(input: z.output<(typeof INPUT)["create_article"]>, ctx: Contesto) {
    const articolo = await creaBozza({
      title: input.title,
      body: input.body,
      excerpt: input.excerpt ?? null,
      category: input.category ?? null,
      authorName: input.authorName ?? null,
      assetId: input.assetId ?? null,
    });
    return {
      articolo: esponiArticolo(articolo, ctx.base),
      prossimoPasso: `È una bozza: si pubblica solo da ${ctx.base}/admin/news/${articolo.id}. Nessun tool di questo server pubblica.`,
    };
  },

  async list_articles(input: z.output<(typeof INPUT)["list_articles"]>, ctx: Contesto) {
    const articoli = await elencaArticoli(input.status);
    return {
      articoli: articoli.map((a) => esponiArticolo(a, ctx.base)),
    };
  },

  async get_article(input: z.output<(typeof INPUT)["get_article"]>, ctx: Contesto) {
    const articolo = await getArticolo(input.id);
    return {
      articolo: esponiArticolo(articolo, ctx.base),
      body: articolo.body,
    };
  },

  async update_article(input: z.output<(typeof INPUT)["update_article"]>, ctx: Contesto) {
    const { id, ...campi } = input;
    const articolo = await aggiornaBozza(id, campi);
    return { articolo: esponiArticolo(articolo, ctx.base), body: articolo.body };
  },

  async archive_article(input: z.output<(typeof INPUT)["archive_article"]>, ctx: Contesto) {
    const articolo = await archiviaArticolo(input.id);
    return { articolo: esponiArticolo(articolo, ctx.base) };
  },
};

// ---------- superficie per il registry ----------

export function elencoToolNews() {
  return (Object.keys(INPUT) as (keyof typeof INPUT)[]).map((nome) => {
    const schema = z.toJSONSchema(INPUT[nome]) as Record<string, unknown>;
    delete schema.$schema;
    return { name: nome, description: DESCRIZIONI_NEWS[nome], inputSchema: schema };
  });
}

export function esisteToolNews(nome: string): boolean {
  return nome in INPUT;
}

export function nomiToolNews(): string[] {
  return Object.keys(INPUT);
}

export async function eseguiToolNews(
  nome: string,
  argomenti: unknown,
  ctx: Contesto,
): Promise<{ testo: string; errore: boolean }> {
  const schema = INPUT[nome as keyof typeof INPUT];
  const input = schema.safeParse(argomenti ?? {});
  if (!input.success) {
    return {
      testo: `Argomenti non validi per ${nome}:\n${z.prettifyError(input.error)}`,
      errore: true,
    };
  }
  try {
    const esito = await TOOL[nome as keyof typeof INPUT](input.data as never, ctx);
    return { testo: JSON.stringify(esito, null, 2), errore: false };
  } catch (err) {
    // ErroreArticolo ed ErroreTool sono già scritti per essere letti da un
    // modello: cosa è andato storto e cosa fare.
    if (err instanceof ErroreArticolo || err instanceof ErroreTool) {
      return { testo: err.message, errore: true };
    }
    const messaggio = err instanceof Error ? err.message : String(err);
    return {
      testo: `Errore interno in ${nome}: ${messaggio}. Riprova; se persiste segnalalo all'admin.`,
      errore: true,
    };
  }
}
