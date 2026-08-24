// La libreria foto: materiale nostro (palazzetto, squadra, tifosi) e, da
// agosto 2026, anche immagini importate da un URL esterno — quelle portano
// `origin_url` valorizzato, che è l'unico modo per riconoscerle dopo.
// I byte finiscono sempre nel nostro archivio locale (src/lib/media/
// archivio.ts), mai linkati dall'origine.
// I metadati (dimensioni, mime, EXIF) si leggono sempre server-side dai byte
// veri: quello che dichiara il client non tocca mai il database.

import { randomUUID } from "node:crypto";

import { and, arrayContains, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import exifReader from "exif-reader";
import sharp from "sharp";

import { db } from "@/src/db";
import { mediaAssets, news, socialMediaItems } from "@/src/db/schema";
import {
  cancellaFile,
  leggiFile,
  salvaFile,
  urlFile,
} from "@/src/lib/media/archivio";
import { comprimi } from "@/src/lib/media/comprimi";
import { firmaUpload } from "@/src/lib/media/firma-upload";
import { scaricaImmagine } from "@/src/lib/media/scarica";
import { urlSito } from "@/src/lib/sito";

export type MediaAsset = typeof mediaAssets.$inferSelect;

// I formati che Instagram e satori digeriscono; tutto il resto si rifiuta
// all'ingresso (il riquadro a 1080×1350 riguarda le proporzioni, non i
// formati esotici tipo HEIC che sharp qui non decodifica).
const MIME_PER_FORMATO: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const ESTENSIONE_PER_FORMATO: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

export interface MetadatiLetti {
  width: number;
  height: number;
  mime: string;
  bytes: number;
  formato: string;
  takenAt: Date | null;
}

/** Legge dai byte: dimensioni, formato e data di scatto EXIF se presente. */
export async function leggiMetadati(buffer: Buffer): Promise<MetadatiLetti> {
  const meta = await sharp(buffer).metadata();
  const formato = meta.format ?? "";
  const mime = MIME_PER_FORMATO[formato];
  if (!mime || !meta.width || !meta.height) {
    throw new Error(
      `formato immagine non gestito ("${formato || "sconosciuto"}"): si accettano JPEG, PNG e WebP`,
    );
  }

  let takenAt: Date | null = null;
  if (meta.exif) {
    try {
      const exif = exifReader(meta.exif);
      const scatto = exif.Photo?.DateTimeOriginal;
      if (scatto instanceof Date && !Number.isNaN(scatto.getTime())) {
        takenAt = scatto;
      }
    } catch {
      // EXIF corrotto: non è un errore, semplicemente niente taken_at
    }
  }

  return {
    width: meta.width,
    height: meta.height,
    mime,
    bytes: buffer.byteLength,
    formato,
    takenAt,
  };
}

function chiaveStorage(id: string, formato: string, creato: Date): string {
  const anno = creato.getFullYear();
  const mese = String(creato.getMonth() + 1).padStart(2, "0");
  return `${anno}/${mese}/${id}.${ESTENSIONE_PER_FORMATO[formato]}`;
}

/**
 * Carica una foto nella libreria: byte → bucket, metadati → riga ready.
 * `takenAt` cade sull'EXIF se c'è, altrimenti sulla data di upload.
 */
export async function caricaAsset(
  buffer: Buffer,
  opts: {
    source: "admin" | "mcp";
    caption?: string | null;
    tags?: string[];
    /** Se i byte arrivano da un URL esterno: da dove. Traccia la provenienza. */
    originUrl?: string | null;
  },
): Promise<MediaAsset> {
  // Prima si legge l'originale (valida il formato e salva la data EXIF),
  // poi si comprime: la compressione scarta i metadati.
  const originale = await leggiMetadati(buffer);
  const compresso = await comprimi(buffer);
  const metadati = await leggiMetadati(compresso.dati);
  const id = randomUUID();
  const adesso = new Date();
  const chiave = chiaveStorage(id, metadati.formato, adesso);

  await salvaFile(chiave, compresso.dati);

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      id,
      status: "ready",
      storageKey: chiave,
      url: urlFile(chiave),
      width: metadati.width,
      height: metadati.height,
      mime: metadati.mime,
      bytes: metadati.bytes,
      source: opts.source,
      originUrl: opts.originUrl ?? null,
      caption: opts.caption?.trim() || null,
      takenAt: originale.takenAt ?? adesso,
      tags: normalizzaTags(opts.tags ?? []),
    })
    .returning();
  return asset;
}

/**
 * Importa in libreria un'immagine che sta a un URL esterno: si scarica coi
 * paletti di scarica.ts, si valida coi soliti sharp + EXIF e finisce sul
 * nostro bucket. La copia è voluta: l'URL di partenza può cambiare o morire,
 * e i post renderizzati non possono dipendere dal server di qualcun altro.
 *
 * `origin_url` resta come traccia della provenienza. Attenzione: prendere
 * un'immagine da un sito NON dà il diritto di pubblicarla — quel giudizio
 * sta a chi approva il post in /admin/social, e per questo la provenienza è
 * scritta in chiaro nella pagina admin e restituita dai tool MCP.
 */
export async function importaAssetDaUrl(
  indirizzo: string,
  opts: { source: "admin" | "mcp"; caption?: string | null; tags?: string[] },
): Promise<MediaAsset> {
  const { buffer, url } = await scaricaImmagine(indirizzo);
  return caricaAsset(buffer, { ...opts, originUrl: url });
}

export function normalizzaTags(tags: string[]): string[] {
  return [
    ...new Set(
      tags
        .flatMap((t) => t.split(/[\s,]+/))
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ];
}

/**
 * URL firmato per l'upload via MCP: la riga nasce `pending` (senza
 * metadati) e diventa `ready` solo con finalizzaAsset, quando il file
 * è davvero sul bucket. Niente byte nei parametri MCP.
 */
export async function creaUploadFirmato(opts: {
  caption?: string | null;
  tags?: string[];
}): Promise<{ asset: MediaAsset; uploadUrl: string; token: string }> {
  const id = randomUUID();
  // L'estensione vera si scopre alla finalizzazione: la chiave è neutra
  const chiave = `${new Date().getFullYear()}/mcp/${id}`;

  const token = firmaUpload(id);
  const uploadUrl = `${urlSito()}/api/media/carica/${id}?token=${token}`;

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      id,
      status: "pending",
      storageKey: chiave,
      url: urlFile(chiave),
      source: "mcp",
      caption: opts.caption?.trim() || null,
      tags: normalizzaTags(opts.tags ?? []),
    })
    .returning();

  return { asset, uploadUrl, token };
}

/** Scarica il file di un asset pending, ne legge i metadati e lo promuove a ready. */
export async function finalizzaAsset(id: string): Promise<MediaAsset> {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) throw new Error(`asset ${id} inesistente`);
  if (asset.status === "ready") return asset;

  const dati = await leggiFile(asset.storageKey);
  if (!dati) {
    throw new Error(
      `il file dell'asset ${id} non è nell'archivio: l'upload all'URL firmato è andato a buon fine?`,
    );
  }

  // Come in caricaAsset: EXIF dall'originale, poi si comprime e si
  // sovrascrive il file (stessa chiave: l'URL non cambia).
  const originale = await leggiMetadati(dati);
  const compresso = await comprimi(dati);
  if (compresso.dati !== dati) {
    await salvaFile(asset.storageKey, compresso.dati);
  }

  const metadati = await leggiMetadati(compresso.dati);
  const [pronto] = await db
    .update(mediaAssets)
    .set({
      status: "ready",
      width: metadati.width,
      height: metadati.height,
      mime: metadati.mime,
      bytes: metadati.bytes,
      takenAt: asset.takenAt ?? originale.takenAt ?? new Date(),
    })
    .where(eq(mediaAssets.id, id))
    .returning();
  return pronto;
}

export interface FiltroAssets {
  tag?: string;
  dal?: Date;
  al?: Date;
  limite?: number;
}

/** Gli asset pronti, dal più recente. `taken_at` comanda l'ordinamento. */
export async function elencaAssets(filtro: FiltroAssets = {}): Promise<MediaAsset[]> {
  const clausole: SQL[] = [eq(mediaAssets.status, "ready")];
  if (filtro.tag) clausole.push(arrayContains(mediaAssets.tags, [filtro.tag.toLowerCase()]));
  if (filtro.dal) clausole.push(gte(mediaAssets.takenAt, filtro.dal));
  if (filtro.al) clausole.push(lte(mediaAssets.takenAt, filtro.al));

  return db
    .select()
    .from(mediaAssets)
    .where(and(...clausole))
    .orderBy(desc(mediaAssets.takenAt))
    .limit(Math.min(filtro.limite ?? 20, 100));
}

/**
 * Per la pagina admin: TUTTI gli asset (anche i pending rimasti a metà,
 * che l'admin deve poter vedere e cancellare) con il numero di post che
 * li usano.
 */
export async function elencaAssetsAdmin(): Promise<
  (MediaAsset & { usi: number })[]
> {
  const assets = await db
    .select()
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(200);
  if (assets.length === 0) return [];

  const usi = await db
    .select({ assetId: socialMediaItems.assetId })
    .from(mediaAssets)
    .innerJoin(socialMediaItems, eq(socialMediaItems.assetId, mediaAssets.id));
  const conteggio = new Map<string, number>();
  for (const u of usi) {
    if (u.assetId) conteggio.set(u.assetId, (conteggio.get(u.assetId) ?? 0) + 1);
  }
  return assets.map((a) => ({ ...a, usi: conteggio.get(a.id) ?? 0 }));
}

export async function aggiornaAsset(
  id: string,
  campi: { caption?: string | null; tags?: string[] },
): Promise<void> {
  await db
    .update(mediaAssets)
    .set({
      ...(campi.caption !== undefined ? { caption: campi.caption?.trim() || null } : {}),
      ...(campi.tags !== undefined ? { tags: normalizzaTags(campi.tags) } : {}),
    })
    .where(eq(mediaAssets.id, id));
}

/** In quanti post e articoli è usato l'asset (0 = cancellabile). */
export async function usiAsset(id: string): Promise<number> {
  // Tre posti, e solo i primi due hanno una FK `restrict` a fare da rete:
  // le foto dentro il corpo di un articolo stanno in un jsonb, quindi qui è
  // l'UNICO controllo che impedisce di cancellare una foto pubblicata e
  // lasciare un buco a metà articolo.
  const [slide, copertine, dentroArticoli] = await Promise.all([
    db
      .select({ id: socialMediaItems.id })
      .from(socialMediaItems)
      .where(eq(socialMediaItems.assetId, id)),
    db.select({ id: news.id }).from(news).where(eq(news.assetId, id)),
    db
      .select({ id: news.id })
      .from(news)
      .where(
        sql`${news.body} is not null and exists (
          select 1 from jsonb_array_elements(${news.body}) blocco
          where blocco->>'assetId' = ${id}
        )`,
      ),
  ]);
  // Un articolo può usare la stessa foto in copertina E nel corpo: conta una volta
  const idArticoli = new Set([
    ...copertine.map((r) => r.id),
    ...dentroArticoli.map((r) => r.id),
  ]);
  return slide.length + idArticoli.size;
}

/** Cancella riga e file, solo se nessun post lo usa (la FK restrict fa da rete). */
export async function cancellaAsset(id: string): Promise<void> {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) return;
  if ((await usiAsset(id)) > 0) {
    throw new Error(
      "la foto è usata in almeno un post o articolo: prima archivia o modifica quei contenuti",
    );
  }
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  await cancellaFile(asset.storageKey);
}
