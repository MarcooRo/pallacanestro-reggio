// Aggiornamento news dalle due fonti. In Fase 3 lo lancia l'admin a mano
// (o lo script); in Fase 4 diventerà anche un cron — stessa funzione.
// Ogni fonte è indipendente: se una fallisce, l'altra procede
// (last-known-good: niente sovrascritture, solo inserimenti).

import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { competitions, ingestionRuns, news } from "@/src/db/schema";
import type { NewsCanonica } from "@/src/ingestion/normalize";
import { getNewsLba } from "@/src/ingestion/sources/lba";
import { getNewsWordPress } from "@/src/ingestion/sources/prwordpress";

async function salvaNews(items: NewsCanonica[]): Promise<number> {
  if (items.length === 0) return 0;
  // Il contenuto di una news non cambia: basta inserire le nuove.
  const inserite = await db
    .insert(news)
    .values(
      items.map((n) => ({
        source: n.source,
        sourceId: n.sourceId,
        title: n.title,
        url: n.url,
        excerpt: n.excerpt,
        category: n.category,
        imageUrl: n.imageUrl,
        publishedAt: n.publishedAt,
      })),
    )
    .onConflictDoNothing({ target: [news.source, news.sourceId] })
    .returning({ id: news.id });
  return inserite.length;
}

async function logRun(
  fonte: string,
  esito: { seen?: number; changed?: number; errore?: string },
) {
  await db.insert(ingestionRuns).values({
    source: fonte,
    target: "news",
    status: esito.errore ? "failed" : "ok",
    finishedAt: new Date(),
    recordsSeen: esito.seen ?? null,
    recordsChanged: esito.changed ?? null,
    error: esito.errore ?? null,
  });
}

export interface EsitoNews {
  nuoveLba: number;
  nuoveWordPress: number;
  errori: string[];
}

export async function aggiornaNews(): Promise<EsitoNews> {
  const esito: EsitoNews = { nuoveLba: 0, nuoveWordPress: 0, errori: [] };

  // c_id risolto a runtime: la Regular Season corrente dal database.
  try {
    const [rs] = await db
      .select({ lbaId: competitions.lbaChampionshipId })
      .from(competitions)
      .where(eq(competitions.typeCode, "RS"))
      .orderBy(desc(competitions.seasonYear))
      .limit(1);
    if (!rs?.lbaId) throw new Error("Nessuna Regular Season corrente nel database");

    const items = await getNewsLba(rs.lbaId);
    esito.nuoveLba = await salvaNews(items);
    await logRun("lba", { seen: items.length, changed: esito.nuoveLba });
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    esito.errori.push(`LBA: ${messaggio}`);
    await logRun("lba", { errore: messaggio });
  }

  try {
    const items = await getNewsWordPress();
    esito.nuoveWordPress = await salvaNews(items);
    await logRun("pr_wordpress", { seen: items.length, changed: esito.nuoveWordPress });
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    esito.errori.push(`WordPress: ${messaggio}`);
    await logRun("pr_wordpress", { errore: messaggio });
  }

  return esito;
}
