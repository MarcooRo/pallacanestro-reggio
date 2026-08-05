import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { news } from "@/src/db/schema";

// 'pr_wordpress' = news della società (Reggio), 'lba' = Serie A in generale.
export type FonteNews = "pr_wordpress" | "lba";

export async function getNews(limite = 50, fonte?: FonteNews) {
  return db
    .select()
    .from(news)
    .where(fonte ? eq(news.source, fonte) : undefined)
    .orderBy(desc(news.isPinned), desc(news.publishedAt))
    .limit(limite);
}

// La singola news, per la pagina di lettura in-app.
export async function getNewsById(id: string) {
  const [riga] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  return riga ?? null;
}
