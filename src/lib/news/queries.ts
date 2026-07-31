import { desc } from "drizzle-orm";

import { db } from "@/src/db";
import { news } from "@/src/db/schema";

export async function getNews(limite = 50) {
  return db
    .select()
    .from(news)
    .orderBy(desc(news.isPinned), desc(news.publishedAt))
    .limit(limite);
}
