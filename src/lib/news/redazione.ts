// Scrittura degli articoli nostri (source 'redazione'). Un posto solo,
// usato sia dai tool MCP sia dalle server action admin: le regole della
// forma (corpo non vuoto, copertina che esiste davvero, slug unico) non
// possono divergere tra i due ingressi.
//
// Guardrail: qui NON si scrive mai 'published'. Le funzioni di questo
// modulo producono e modificano bozze; la pubblicazione vive solo in
// src/lib/news/actions.ts, dietro controllo di ruolo.

import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { mediaAssets, news } from "@/src/db/schema";
import {
  assetIdsDelCorpo,
  haParagrafi,
  MAX_IMMAGINI_CORPO,
  type Blocco,
} from "@/src/lib/news/blocchi";
import { controllaGrafici } from "@/src/lib/news/grafici/dati";

export const SORGENTE_REDAZIONE = "redazione";

export type Articolo = typeof news.$inferSelect;

/** Errore con messaggio pensato per essere letto da chi ha sbagliato. */
export class ErroreArticolo extends Error {}

// ---------- slug ----------

// Segni diacritici staccati dalla NFD: "però" → "pero", non "per".
const SEGNI = /[\u0300-\u036f]/g;

export function slugDaTitolo(titolo: string): string {
  const base = titolo
    .normalize("NFD")
    .replace(SEGNI, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return base || "articolo";
}

/** Slug libero: se è già preso ci attacca -2, -3, … (mai due articoli sotto lo stesso indirizzo). */
async function slugLibero(titolo: string, escludiId?: string): Promise<string> {
  const base = slugDaTitolo(titolo);
  for (let n = 1; n < 50; n++) {
    const candidato = n === 1 ? base : `${base}-${n}`;
    const [preso] = await db
      .select({ id: news.id })
      .from(news)
      .where(
        escludiId
          ? and(eq(news.slug, candidato), ne(news.id, escludiId))
          : eq(news.slug, candidato),
      )
      .limit(1);
    if (!preso) return candidato;
  }
  throw new ErroreArticolo(
    `Troppi articoli con un titolo simile a "${titolo}": cambia il titolo.`,
  );
}

// ---------- foto ----------

/** Una foto usabile: esiste in libreria ed è arrivata a 'ready'. */
async function fotoUsabile(assetId: string) {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId))
    .limit(1);
  if (!asset) {
    throw new ErroreArticolo(
      `La foto ${assetId} non esiste nella libreria. Usa list_media per vedere quelle disponibili.`,
    );
  }
  if (asset.status !== "ready") {
    throw new ErroreArticolo(
      `La foto ${assetId} è ancora in caricamento (status ${asset.status}): chiudi l'upload con confirm_upload prima di usarla.`,
    );
  }
  return asset;
}

async function copertina(assetId: string): Promise<string> {
  return (await fotoUsabile(assetId)).url;
}

// Le foto dentro il corpo non hanno una foreign key che le protegga (stanno
// in un jsonb), quindi il controllo alla scrittura è l'unica rete: un id
// inventato deve fermarsi qui, non diventare un buco in pagina.
async function controllaImmaginiDelCorpo(body: Blocco[]): Promise<void> {
  const ids = assetIdsDelCorpo(body);
  if (ids.length > MAX_IMMAGINI_CORPO) {
    throw new ErroreArticolo(
      `Troppe foto nel corpo: ${ids.length}, il massimo è ${MAX_IMMAGINI_CORPO}. Tienine le più significative.`,
    );
  }
  for (const id of ids) await fotoUsabile(id);
}

// ---------- lettura per gli ingressi di scrittura ----------

export async function getArticolo(id: string): Promise<Articolo> {
  const [riga] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  if (!riga) {
    throw new ErroreArticolo(
      `L'articolo ${id} non esiste. Usa list_articles per vedere quelli in lavorazione.`,
    );
  }
  if (riga.source !== SORGENTE_REDAZIONE) {
    throw new ErroreArticolo(
      `${id} è una news di fonte esterna (${riga.source}), non un articolo nostro: non si modifica da qui.`,
    );
  }
  return riga;
}

function soloBozza(articolo: Articolo, azione: string): void {
  if (articolo.status !== "draft") {
    throw new ErroreArticolo(
      `L'articolo è in stato "${articolo.status}": ${azione} vale solo per le bozze. Se serve un testo diverso, scrivine uno nuovo e archivia questo.`,
    );
  }
}

// ---------- scrittura ----------

export interface CampiArticolo {
  title: string;
  body: Blocco[];
  excerpt?: string | null;
  category?: string | null;
  authorName?: string | null;
  assetId?: string | null;
  publishedAt?: Date | null;
}

async function controllaCorpo(body: Blocco[]): Promise<void> {
  if (!haParagrafi(body)) {
    throw new ErroreArticolo(
      "Il corpo è fatto solo di sottotitoli, elenchi, foto o widget: un articolo ha bisogno di almeno un paragrafo di testo (blocco 'paragrafo' o 'md').",
    );
  }
  await controllaImmaginiDelCorpo(body);
  // I widget: nome che esiste, parametri validi, riferimenti veri. Lancia
  // ErroreTool, che il layer MCP riporta com'è (cfr. src/lib/news/mcp.ts).
  await controllaGrafici(body);
}

export async function creaBozza(campi: CampiArticolo): Promise<Articolo> {
  await controllaCorpo(campi.body);
  const imageUrl = campi.assetId ? await copertina(campi.assetId) : null;
  const slug = await slugLibero(campi.title);

  const [riga] = await db
    .insert(news)
    .values({
      source: SORGENTE_REDAZIONE,
      status: "draft", // letterale: nessun input arriva a status
      title: campi.title,
      slug,
      url: null,
      excerpt: campi.excerpt ?? null,
      category: campi.category ?? null,
      imageUrl,
      assetId: campi.assetId ?? null,
      body: campi.body,
      authorName: campi.authorName ?? null,
      // Data proposta: la pubblicazione la riscrive col momento vero
      publishedAt: campi.publishedAt ?? new Date(),
    })
    .returning();
  return riga;
}

export async function aggiornaBozza(
  id: string,
  campi: Partial<CampiArticolo>,
): Promise<Articolo> {
  const articolo = await getArticolo(id);
  soloBozza(articolo, "la modifica");
  if (campi.body) await controllaCorpo(campi.body);

  const imageUrl =
    campi.assetId === undefined
      ? undefined
      : campi.assetId === null
        ? null
        : await copertina(campi.assetId);

  const [riga] = await db
    .update(news)
    .set({
      // status assente per costruzione: questo modulo non pubblica
      ...(campi.title !== undefined
        ? { title: campi.title, slug: await slugLibero(campi.title, id) }
        : {}),
      ...(campi.body !== undefined ? { body: campi.body } : {}),
      ...(campi.excerpt !== undefined ? { excerpt: campi.excerpt } : {}),
      ...(campi.category !== undefined ? { category: campi.category } : {}),
      ...(campi.authorName !== undefined ? { authorName: campi.authorName } : {}),
      ...(campi.assetId !== undefined ? { assetId: campi.assetId, imageUrl } : {}),
      ...(campi.publishedAt !== undefined && campi.publishedAt
        ? { publishedAt: campi.publishedAt }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(news.id, id))
    .returning();
  return riga;
}

export async function archiviaArticolo(id: string): Promise<Articolo> {
  const articolo = await getArticolo(id);
  const [riga] = await db
    .update(news)
    .set({ status: "archived", isPinned: false, updatedAt: new Date() })
    .where(eq(news.id, id))
    .returning();
  return riga ?? articolo;
}

/** Gli articoli nostri per l'admin, in lavorazione prima di tutto. */
export async function elencaArticoli(stato?: string) {
  return db
    .select()
    .from(news)
    .where(
      stato
        ? and(eq(news.source, SORGENTE_REDAZIONE), eq(news.status, stato))
        : eq(news.source, SORGENTE_REDAZIONE),
    )
    .orderBy(sql`case ${news.status} when 'draft' then 0 when 'published' then 1 else 2 end`, sql`${news.updatedAt} desc`)
    .limit(100);
}
