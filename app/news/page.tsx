import type { Metadata } from "next";

import { NewsCard } from "@/src/components/news-card";
import { getNews } from "@/src/lib/news/queries";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const items = await getNews();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">News</h1>
      {items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Nessuna news in archivio.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </div>
      )}
    </main>
  );
}
