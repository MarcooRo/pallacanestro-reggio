// I tool MCP della coda social. Guardrail strutturali, imposti QUI nel
// codice e non solo nei tipi:
//
//   1. NON ESISTE un tool che pubblica, nemmeno dietro un flag.
//   2. Questo layer scrive `status` solo coi letterali 'draft' (queue_post)
//      e 'archived' (archive_post): nessun input dell'AI raggiunge mai la
//      colonna status. La transizione a 'approved' vive solo nelle server
//      action admin.
//   3. update_post tocca solo bozze, con errore esplicito altrimenti.
//
// Ogni errore è pensato per essere letto da un modello: cosa è andato
// storto e cosa fare, mai uno stack trace.

import { and, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import { signOgUrl } from "@/src/lib/og/firma";
import {
  dimensioniTemplate,
  getTemplateOg,
  nomiTemplateOg,
  tuttiTemplateOg,
} from "@/src/lib/og/registry";
import { renderizzaPost } from "@/src/lib/social/render";

// Un errore "da tool": il messaggio arriva all'AI com'è (isError: true).
export class ErroreTool extends Error {}

const STATI = ["draft", "approved", "publishing", "published", "failed", "archived"] as const;
const PIATTAFORME = ["instagram_feed", "instagram_story"] as const;

// ---------- input dei tool ----------

const mediaInput = z.strictObject({
  template: z.string().describe("Nome del template, da list_og_templates"),
  params: z
    .record(z.string(), z.unknown())
    .describe("Parametri del template, secondo il suo schema"),
});

const INPUT = {
  list_og_templates: z.strictObject({}),
  preview_media: mediaInput,
  queue_post: z.strictObject({
    platform: z.enum(PIATTAFORME),
    caption: z.string().default(""),
    hashtags: z.array(z.string()).default([]),
    media: z
      .array(mediaInput)
      .min(1)
      .max(10)
      .describe("Le slide nell'ordine di pubblicazione (Instagram: max 10)"),
    scheduledAt: z.iso
      .datetime({ offset: true })
      .optional()
      .describe("Proposta di programmazione, ISO 8601 con fuso. L'admin decide in approvazione"),
    notes: z.string().optional().describe("Note per l'admin, non pubblicate"),
    idempotencyKey: z
      .string()
      .optional()
      .describe("Stessa chiave = stesso post: ritenta senza creare doppioni"),
  }),
  list_posts: z.strictObject({
    status: z.enum(STATI).optional(),
    platform: z.enum(PIATTAFORME).optional(),
  }),
  get_post: z.strictObject({ id: z.string().uuid() }),
  update_post: z.strictObject({
    id: z.string().uuid(),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    scheduledAt: z.iso.datetime({ offset: true }).nullable().optional(),
    media: z
      .array(mediaInput)
      .min(1)
      .max(10)
      .optional()
      .describe("Se presente SOSTITUISCE tutte le slide"),
  }),
  archive_post: z.strictObject({ id: z.string().uuid() }),
} satisfies Record<string, z.ZodType>;

export const DESCRIZIONI: Record<keyof typeof INPUT, string> = {
  list_og_templates:
    "Elenca i template grafici disponibili con schema JSON dei parametri, dimensioni ed esempi. Chiamalo prima di preparare qualunque immagine.",
  preview_media:
    "URL firmato dell'anteprima di un'immagine (template + params) senza creare nulla in database.",
  queue_post:
    "Crea un post in stato draft con le sue immagini e le renderizza. Il post NON viene pubblicato: lo approva l'admin dalla pagina /admin/social.",
  list_posts: "Elenca i post in coda, filtrabili per stato e piattaforma.",
  get_post: "Dettaglio completo di un post: stato, caption, slide, anteprime.",
  update_post:
    "Modifica caption, hashtag, note, programmazione proposta o slide di un post ANCORA in stato draft. Dopo l'approvazione non si tocca più.",
  archive_post: "Sposta un post in archived (lo toglie dalla coda).",
};

// ---------- helper ----------

function normalizzaHashtags(hashtags: string[]): string[] {
  return hashtags
    .flatMap((h) => h.split(/\s+/))
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
}

function validaMedia(media: z.output<typeof mediaInput>[]) {
  return media.map((m, i) => {
    const def = getTemplateOg(m.template);
    if (!def) {
      throw new ErroreTool(
        `La slide ${i + 1} usa il template "${m.template}" che non esiste. Template disponibili: ${nomiTemplateOg().join(", ")}. Usa list_og_templates per gli schemi.`,
      );
    }
    const esito = def.schema.safeParse(m.params);
    if (!esito.success) {
      throw new ErroreTool(
        `Parametri non validi per la slide ${i + 1} (template "${m.template}"):\n${z.prettifyError(esito.error)}\nEsempio valido:\n${JSON.stringify(def.esempio, null, 2)}`,
      );
    }
    return { def, params: esito.data, dimensioni: dimensioniTemplate(def) };
  });
}

async function caricaPost(id: string) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id)).limit(1);
  if (!post) {
    throw new ErroreTool(
      `Il post ${id} non esiste. Usa list_posts per vedere quelli in coda.`,
    );
  }
  return post;
}

function esponiPost(post: typeof socialPosts.$inferSelect, base: string) {
  return {
    id: post.id,
    status: post.status,
    platform: post.platform,
    kind: post.kind,
    caption: post.caption,
    hashtags: post.hashtags,
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    notes: post.notes,
    source: post.source,
    error: post.error,
    adminUrl: `${base}/admin/social/${post.id}`,
  };
}

async function mediaDiUnPost(postId: string, base: string) {
  const items = await db
    .select()
    .from(socialMediaItems)
    .where(eq(socialMediaItems.postId, postId))
    .orderBy(socialMediaItems.position);
  return items.map((m) => ({
    position: m.position,
    template: m.template,
    params: m.params,
    width: m.width,
    height: m.height,
    renderedUrl: m.renderedUrl,
    previewUrl: signOgUrl(m.template, m.params, base),
  }));
}

// Render "best effort": il post resta valido anche se il render fallisce,
// l'AI riceve un avviso e può ritentare con update_post o lasciar fare
// all'admin (l'approvazione renderizza i media mancanti).
async function renderConAvviso(postId: string): Promise<string | null> {
  try {
    await renderizzaPost(postId);
    return null;
  } catch (err) {
    return `Attenzione: il render delle immagini è fallito (${err instanceof Error ? err.message : err}). Il post è in coda comunque; l'admin può rigenerarle, oppure correggi i parametri con update_post.`;
  }
}

// ---------- i tool ----------

type Contesto = { base: string };

const TOOL: Record<
  keyof typeof INPUT,
  (input: never, ctx: Contesto) => Promise<unknown>
> = {
  async list_og_templates(_: Record<string, never>, ctx: Contesto) {
    return {
      templates: tuttiTemplateOg().map((t) => {
        const schema = z.toJSONSchema(t.schema) as Record<string, unknown>;
        delete schema.$schema;
        return {
          nome: t.nome,
          descrizione: t.descrizione,
          ...dimensioniTemplate(t),
          schemaParametri: schema,
          esempio: t.esempio,
          esempioPreviewUrl: signOgUrl(t.nome, t.esempio, ctx.base),
        };
      }),
    };
  },

  async preview_media(input: z.output<typeof mediaInput>, ctx: Contesto) {
    const [m] = validaMedia([input]);
    return {
      url: signOgUrl(input.template, m.params, ctx.base),
      ...m.dimensioni,
      nota: "URL firmato dell'anteprima PNG. Nessun dato è stato creato.",
    };
  },

  async queue_post(input: z.output<(typeof INPUT)["queue_post"]>, ctx: Contesto) {
    if (input.idempotencyKey) {
      const [esistente] = await db
        .select()
        .from(socialPosts)
        .where(eq(socialPosts.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (esistente) {
        return {
          giaEsistente: true,
          post: esponiPost(esistente, ctx.base),
          media: await mediaDiUnPost(esistente.id, ctx.base),
        };
      }
    }

    if (input.platform === "instagram_story" && input.media.length > 1) {
      throw new ErroreTool(
        "Una story ha una sola immagine: passa un solo elemento in media, oppure usa instagram_feed per un carosello.",
      );
    }
    const media = validaMedia(input.media);

    const [post] = await db
      .insert(socialPosts)
      .values({
        status: "draft", // letterale: l'input non tocca mai lo status
        platform: input.platform,
        kind: input.media.length > 1 ? "carousel" : "single",
        caption: input.caption,
        hashtags: normalizzaHashtags(input.hashtags),
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        notes: input.notes ?? null,
        source: "mcp",
        idempotencyKey: input.idempotencyKey ?? null,
      })
      .returning();

    await db.insert(socialMediaItems).values(
      media.map((m, i) => ({
        postId: post.id,
        position: i,
        template: m.def.nome,
        params: m.params,
        width: m.dimensioni.width,
        height: m.dimensioni.height,
      })),
    );

    const avviso = await renderConAvviso(post.id);
    return {
      post: esponiPost(post, ctx.base),
      media: await mediaDiUnPost(post.id, ctx.base),
      ...(avviso ? { avviso } : {}),
      prossimoPasso: `Il post è in coda come bozza: l'approvazione avviene solo da ${ctx.base}/admin/social/${post.id}`,
    };
  },

  async list_posts(input: z.output<(typeof INPUT)["list_posts"]>, ctx: Contesto) {
    const filtri: SQL[] = [];
    if (input.status) filtri.push(eq(socialPosts.status, input.status));
    if (input.platform) filtri.push(eq(socialPosts.platform, input.platform));

    const posts = await db
      .select()
      .from(socialPosts)
      .where(filtri.length ? and(...filtri) : undefined)
      .orderBy(desc(socialPosts.updatedAt))
      .limit(50);

    return {
      posts: posts.map((p) => ({
        ...esponiPost(p, ctx.base),
        caption: p.caption.length > 80 ? `${p.caption.slice(0, 80)}…` : p.caption,
      })),
    };
  },

  async get_post(input: z.output<(typeof INPUT)["get_post"]>, ctx: Contesto) {
    const post = await caricaPost(input.id);
    return {
      post: esponiPost(post, ctx.base),
      media: await mediaDiUnPost(post.id, ctx.base),
    };
  },

  async update_post(input: z.output<(typeof INPUT)["update_post"]>, ctx: Contesto) {
    const post = await caricaPost(input.id);
    if (post.status !== "draft") {
      throw new ErroreTool(
        `Il post è in stato "${post.status}" e non si può più modificare via MCP: solo le bozze (draft) sono modificabili. Se serve un contenuto diverso, crea un nuovo post con queue_post e archivia questo.`,
      );
    }

    if (input.media) {
      const media = validaMedia(input.media);
      await db.delete(socialMediaItems).where(eq(socialMediaItems.postId, post.id));
      await db.insert(socialMediaItems).values(
        media.map((m, i) => ({
          postId: post.id,
          position: i,
          template: m.def.nome,
          params: m.params,
          width: m.dimensioni.width,
          height: m.dimensioni.height,
        })),
      );
    }

    await db
      .update(socialPosts)
      .set({
        // status assente per costruzione: questo layer non lo scrive mai
        ...(input.caption !== undefined ? { caption: input.caption } : {}),
        ...(input.hashtags !== undefined
          ? { hashtags: normalizzaHashtags(input.hashtags) }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.scheduledAt !== undefined
          ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null }
          : {}),
        ...(input.media ? { kind: input.media.length > 1 ? "carousel" : "single" } : {}),
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, post.id));

    const avviso = input.media ? await renderConAvviso(post.id) : null;
    const aggiornato = await caricaPost(post.id);
    return {
      post: esponiPost(aggiornato, ctx.base),
      media: await mediaDiUnPost(post.id, ctx.base),
      ...(avviso ? { avviso } : {}),
    };
  },

  async archive_post(input: z.output<(typeof INPUT)["archive_post"]>, ctx: Contesto) {
    const post = await caricaPost(input.id);
    if (post.status === "publishing") {
      throw new ErroreTool(
        "Il post è in pubblicazione proprio ora: non si archivia a metà. Riprova tra qualche minuto o chiedi all'admin.",
      );
    }
    await db
      .update(socialPosts)
      .set({ status: "archived", updatedAt: new Date() }) // letterale, mai da input
      .where(eq(socialPosts.id, post.id));
    return { post: esponiPost({ ...post, status: "archived" }, ctx.base) };
  },
};

// ---------- superficie per la route ----------

export function elencoToolMcp() {
  return (Object.keys(INPUT) as (keyof typeof INPUT)[]).map((nome) => {
    const schema = z.toJSONSchema(INPUT[nome]) as Record<string, unknown>;
    delete schema.$schema;
    return { name: nome, description: DESCRIZIONI[nome], inputSchema: schema };
  });
}

export async function eseguiToolMcp(
  nome: string,
  argomenti: unknown,
  ctx: Contesto,
): Promise<{ testo: string; errore: boolean }> {
  const schema = INPUT[nome as keyof typeof INPUT];
  if (!schema) {
    return {
      testo: `Il tool "${nome}" non esiste. Tool disponibili: ${Object.keys(INPUT).join(", ")}. Nota: non esiste NESSUN tool che pubblica — l'approvazione e la pubblicazione passano solo dall'admin.`,
      errore: true,
    };
  }
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
    if (err instanceof ErroreTool) return { testo: err.message, errore: true };
    const messaggio = err instanceof Error ? err.message : String(err);
    return {
      testo: `Errore interno in ${nome}: ${messaggio}. Riprova; se persiste segnalalo all'admin nelle note di un post o direttamente.`,
      errore: true,
    };
  }
}
