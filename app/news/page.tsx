import type { Metadata } from "next";

import { NewsCard } from "@/src/components/news-card";
import { Pillola } from "@/src/components/pillola";
import { getNews, type FonteNews } from "@/src/lib/news/queries";

export const metadata: Metadata = { title: "News" };

// Reggio è il default: le news della Serie A si scelgono apposta.
const FILTRI: { chiave: string; etichetta: string; fonte?: FonteNews }[] = [
  { chiave: "reggio", etichetta: "Reggio", fonte: "pr_wordpress" },
  { chiave: "seriea", etichetta: "Serie A", fonte: "lba" },
  { chiave: "tutte", etichetta: "Tutte" },
];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const attivo = FILTRI.find((x) => x.chiave === f) ?? FILTRI[0];
  const items = await getNews(50, attivo.fonte);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">News</h1>

      <div className="flex gap-2.5 pl-1">
        {FILTRI.map((filtro) => (
          <Pillola
            key={filtro.chiave}
            href={`/news?f=${filtro.chiave}`}
            attiva={filtro.chiave === attivo.chiave}
          >
            {filtro.etichetta}
          </Pillola>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="taglio-sm border border-border bg-surface p-4 text-sm text-muted">
          Nessuna news in archivio per questo filtro.
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
