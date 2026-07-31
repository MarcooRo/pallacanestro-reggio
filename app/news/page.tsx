import type { Metadata } from "next";

import { NewsCard } from "@/src/components/news-card";
import { getNews } from "@/src/lib/news/queries";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const items = await getNews();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">News</h1>
      {items.length === 0 ? (
        <p className="taglio-sm border border-border bg-surface p-4 text-sm text-muted">
          Nessuna news in archivio.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </div>
      )}
    </main>
  );
}
