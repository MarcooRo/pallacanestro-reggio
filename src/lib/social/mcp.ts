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
import {
  creaUploadFirmato,
  elencaAssets,
  finalizzaAsset,
  importaAssetDaUrl,
  type MediaAsset,
} from "@/src/lib/media/libreria";
import { ErroreScarico } from "@/src/lib/media/scarica";
import { signOgUrl } from "@/src/lib/og/firma";
import { dimensioniTemplate, tuttiTemplateOg } from "@/src/lib/og/registry";
import { ErroreTool } from "@/src/lib/social/errore";
import { mediaInput, risolviMedia } from "@/src/lib/social/forme";
import { renderizzaPost } from "@/src/lib/social/render";

export { ErroreTool };

const STATI = ["draft", "approved", "publishing", "published", "failed", "archived"] as const;
const PIATTAFORME = ["instagram_feed", "instagram_story", "facebook"] as const;

// ---------- input dei tool ----------

// L'anteprima ha senso solo per grafiche da template (l'asset nudo È già
// un'immagine): qui template e params restano obbligatori.
const previewInput = z.strictObject({
  template: z.string().describe("Nome del template, da list_og_templates"),
  params: z
    .record(z.string(), z.unknown())
    .describe("Parametri del template, secondo il suo schema"),
});

const INPUT = {
  list_og_templates: z.strictObject({}),
  preview_media: previewInput,
  queue_post: z.strictObject({
    platform: z
      .enum(PIATTAFORME)
      .describe(
        "Una piattaforma per post. Stesso contenuto su più piattaforme = un post per ciascuna, con caption adattata: Instagram vuole hashtag e niente link; Facebook pochi hashtag e i link funzionano (es. l'articolo su tiforeggiana.it)",
      ),
    caption: z.string().default(""),
    hashtags: z.array(z.string()).default([]),
    media: z
      .array(mediaInput)
      .min(1)
      .max(10)
      .describe(
        "Le slide nell'ordine di pubblicazione (Instagram: max 10). Tre forme: {template,params} grafica; {assetId} foto della libreria così com'è; {assetId,template,params} composizione (es. foto-con-testo, imageUrl si compila da solo)",
      ),
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
      .describe("Se presente SOSTITUISCE tutte le slide (stesse tre forme di queue_post)"),
  }),
  archive_post: z.strictObject({ id: z.string().uuid() }),
  list_media: z.strictObject({
    tag: z.string().optional().describe("Solo asset con questo tag"),
    from: z.iso.datetime({ offset: true }).optional().describe("taken_at da qui in poi"),
    to: z.iso.datetime({ offset: true }).optional().describe("taken_at fino a qui"),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  create_upload_url: z.strictObject({
    caption: z
      .string()
      .optional()
      .describe("Descrizione della foto: è ciò su cui ti baserai per ritrovarla"),
    tags: z.array(z.string()).default([]),
  }),
  confirm_upload: z.strictObject({
    assetId: z.string().uuid().describe("L'asset restituito da create_upload_url"),
  }),
  import_media_url: z.strictObject({
    url: z
      .string()
      .url()
      .describe(
        "URL diretto al file immagine (JPEG, PNG o WebP), non la pagina che la contiene",
      ),
    caption: z
      .string()
      .optional()
      .describe("Cosa si vede: è ciò su cui ti baserai per ritrovarla in list_media"),
    tags: z.array(z.string()).default([]),
  }),
} satisfies Record<string, z.ZodType>;

export const DESCRIZIONI: Record<keyof typeof INPUT, string> = {
  list_og_templates:
    "Elenca i template grafici disponibili con schema JSON dei parametri, dimensioni ed esempi. Chiamalo prima di preparare qualunque immagine.",
  preview_media:
    "URL firmato dell'anteprima di un'immagine (template + params) senza creare nulla in database.",
  queue_post:
    "Crea un post in stato draft con le sue immagini e le renderizza. Il post NON viene pubblicato: lo approva l'admin dalla pagina /admin/social. Piattaforme: instagram_feed, instagram_story (una sola immagine, meglio se formato story 1080×1920) e facebook. Per uscire su più piattaforme crea un post per ciascuna, differenziando la caption.",
  list_posts: "Elenca i post in coda, filtrabili per stato e piattaforma.",
  get_post: "Dettaglio completo di un post: stato, caption, slide, anteprime.",
  update_post:
    "Modifica caption, hashtag, note, programmazione proposta o slide di un post ANCORA in stato draft. Dopo l'approvazione non si tocca più.",
  archive_post: "Sposta un post in archived (lo toglie dalla coda).",
  list_media:
    "Le foto della libreria (materiale nostro: palazzetto, squadra, tifosi), dalla più recente. caption e tags sono ciò su cui basarti per scegliere la foto giusta: sono scritti apposta. Usa l'id in queue_post come assetId, da solo o con un template di composizione.",
  create_upload_url:
    "URL firmato per caricare nella libreria un'immagine che hai prodotto tu: PUT dei byte all'uploadUrl (header x-upsert non serve), poi confirm_upload. MAI passare immagini in base64 nei parametri dei tool.",
  confirm_upload:
    "Chiude l'upload iniziato con create_upload_url: verifica che il file sia sul bucket, ne legge dimensioni e formato e rende l'asset usabile nei post.",
  import_media_url:
    "Mette in libreria un'immagine che sta già online: il server la scarica dall'URL, ne legge dimensioni e formato e la copia sul nostro storage (l'URL di partenza non viene linkato nei post). Comodo per non dover far caricare tutto a mano dall'admin. La provenienza resta salvata e visibile all'admin: NON usarlo per foto di agenzie, testate o altri club, che non si possono ripubblicare — se una foto ci serve ma non è nostra, meglio il template citazione-notizia, che è sola tipografia.",
};

// ---------- helper ----------

function normalizzaHashtags(hashtags: string[]): string[] {
  return hashtags
    .flatMap((h) => h.split(/\s+/))
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
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
    kind: m.kind,
    assetId: m.assetId,
    template: m.template,
    params: m.params,
    width: m.width,
    height: m.height,
    renderedUrl: m.renderedUrl,
    // L'asset nudo non ha un'anteprima da generare: l'immagine è l'asset
    previewUrl: m.template ? signOgUrl(m.template, m.params, base) : m.renderedUrl,
  }));
}

function esponiAsset(a: MediaAsset) {
  return {
    id: a.id,
    url: a.url,
    width: a.width,
    height: a.height,
    mime: a.mime,
    caption: a.caption,
    tags: a.tags,
    takenAt: a.takenAt?.toISOString() ?? null,
    // null = foto nostra. Valorizzato = scaricata da lì, quindi da trattare
    // come materiale di qualcun altro finché l'admin non dice il contrario.
    origine: a.originUrl,
  };
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

  async preview_media(input: z.output<typeof previewInput>, ctx: Contesto) {
    const [m] = await risolviMedia([input]);
    return {
      url: signOgUrl(input.template, m.params, ctx.base),
      width: m.width,
      height: m.height,
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
    const media = await risolviMedia(input.media);

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
      media.map((m, i) => ({ postId: post.id, position: i, ...m })),
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
      const media = await risolviMedia(input.media);
      await db.delete(socialMediaItems).where(eq(socialMediaItems.postId, post.id));
      await db.insert(socialMediaItems).values(
        media.map((m, i) => ({ postId: post.id, position: i, ...m })),
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

  async list_media(input: z.output<(typeof INPUT)["list_media"]>) {
    const assets = await elencaAssets({
      tag: input.tag,
      dal: input.from ? new Date(input.from) : undefined,
      al: input.to ? new Date(input.to) : undefined,
      limite: input.limit,
    });
    return {
      assets: assets.map(esponiAsset),
      nota: "caption e tags sono la descrizione su cui basarti; takenAt è la data di scatto.",
    };
  },

  async create_upload_url(input: z.output<(typeof INPUT)["create_upload_url"]>) {
    const { asset, uploadUrl } = await creaUploadFirmato({
      caption: input.caption ?? null,
      tags: input.tags,
    });
    return {
      assetId: asset.id,
      uploadUrl,
      prossimoPasso:
        "PUT dei byte dell'immagine (JPEG, PNG o WebP) all'uploadUrl con Content-Type corretto, poi confirm_upload con questo assetId. L'URL scade presto: carica subito.",
    };
  },

  async confirm_upload(input: z.output<(typeof INPUT)["confirm_upload"]>) {
    try {
      const asset = await finalizzaAsset(input.assetId);
      return { asset: esponiAsset(asset) };
    } catch (err) {
      throw new ErroreTool(
        `Finalizzazione fallita: ${err instanceof Error ? err.message : err}`,
      );
    }
  },

  async import_media_url(input: z.output<(typeof INPUT)["import_media_url"]>) {
    try {
      const asset = await importaAssetDaUrl(input.url, {
        source: "mcp",
        caption: input.caption ?? null,
        tags: input.tags,
      });
      return {
        asset: esponiAsset(asset),
        nota: "L'immagine è sul nostro storage e usabile come assetId nei post. La provenienza è registrata: se non è materiale nostro, dillo nelle note del post così l'admin decide in approvazione.",
      };
    } catch (err) {
      // ErroreScarico ha già un messaggio scritto per essere letto da te
      if (err instanceof ErroreScarico) throw new ErroreTool(err.message);
      throw new ErroreTool(
        `Import da URL fallito: ${err instanceof Error ? err.message : err}. Se il messaggio parla di formato, l'URL non punta a un JPEG/PNG/WebP.`,
      );
    }
  },
};

// ---------- superficie per la route ----------

export function nomiToolMcp(): string[] {
  return Object.keys(INPUT);
}

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
