import { and, desc, eq, getTableColumns, or, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { mediaAssets, news } from "@/src/db/schema";

// 'pr_wordpress' = news della società (Reggio), 'lba' = Serie A in generale,
// 'redazione' = articoli scritti da noi (gli unici col corpo su database).
export type FonteNews = "pr_wordpress" | "lba" | "redazione";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Il filtro che non si tocca: fuori da qui le bozze non escono mai. Vale
// per la lista, per la home e per la pagina di lettura.
const PUBBLICATE = eq(news.status, "published");

export async function getNews(limite = 50, fonte?: FonteNews) {
  return db
    .select()
    .from(news)
    .where(fonte ? and(PUBBLICATE, eq(news.source, fonte)) : PUBBLICATE)
    .orderBy(desc(news.isPinned), desc(news.publishedAt))
    .limit(limite);
}

// La singola news pubblicata, per la pagina di lettura in-app. Accetta
// l'uuid (le news di fonte) o lo slug (gli articoli nostri): un solo
// indirizzo pubblico per entrambe le forme.
//
// Porta anche la caption della copertina: è la descrizione scritta a mano
// in libreria, e diventa l'alt dell'immagine in pagina (accessibilità, e
// ricerca immagini). Left join: le news di fonte non hanno un asset.
export async function getNewsPubblicata(chiave: string) {
  const per = UUID.test(chiave)
    ? or(eq(news.id, chiave), eq(news.slug, chiave))
    : eq(news.slug, chiave);
  const [riga] = await db
    .select({
      ...getTableColumns(news),
      copertinaCaption: mediaAssets.caption,
    })
    .from(news)
    .leftJoin(mediaAssets, eq(news.assetId, mediaAssets.id))
    .where(and(PUBBLICATE, per))
    .limit(1);
  return riga ?? null;
}

// Per l'anteprima admin: qualunque stato, quindi MAI usata in pagine
// pubbliche. Il controllo di ruolo sta in chi la chiama.
export async function getNewsQualsiasiStato(id: string) {
  if (!UUID.test(id)) return null;
  const [riga] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  return riga ?? null;
}

// Per la sitemap: solo gli articoli NOSTRI pubblicati. Le news di fonte
// restano fuori di proposito — il testo è di altri, indicizzarne la copia
// vale come contenuto duplicato e non porta niente a noi.
export async function getArticoliPerSitemap() {
  return db
    .select({
      slug: news.slug,
      publishedAt: news.publishedAt,
      updatedAt: news.updatedAt,
    })
    .from(news)
    .where(and(PUBBLICATE, eq(news.source, "redazione")))
    .orderBy(desc(news.publishedAt))
    .limit(5000);
}

/** Quante bozze aspettano: il numero accanto alla voce di menu in admin. */
export async function contaBozzeArticoli(): Promise<number> {
  const [riga] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(news)
    .where(and(eq(news.source, "redazione"), eq(news.status, "draft")));
  return riga?.n ?? 0;
}
