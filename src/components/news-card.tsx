// Card news: titolo, estratto, categoria, immagine. Apre la lettura
// in-app (/news/[id]): corpo dell'articolo letto al volo dalla fonte,
// impaginato col design dell'app.

import Image from "next/image";
import Link from "next/link";

import type { news } from "@/src/db/schema";
import { soloOra } from "@/src/lib/date";

export const nomeFonte: Record<string, string> = {
  lba: "Lega Basket",
  pr_wordpress: "Pallacanestro Reggiana",
};

export function NewsCard({ item }: { item: typeof news.$inferSelect }) {
  return (
    <Link
      href={`/news/${item.id}`}
      className="taglio-sm group flex gap-3 card p-3 transition-colors hover:border-brand"
    >
      {item.imageUrl && (
        <Image
          src={item.imageUrl}
          alt=""
          width={96}
          height={64}
          className="shrink-0 self-center object-cover"
          style={{ width: 96, height: 64 }}
        />
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="eyebrow">
          {/* le news di Reggio si riconoscono al volo: fonte in rosso */}
          <span className={item.source === "pr_wordpress" ? "font-bold !text-brand-vivid" : ""}>
            {nomeFonte[item.source] ?? item.source}
          </span>
          {item.category ? ` · ${item.category}` : ""} · {soloOra(item.publishedAt)}
        </span>
        <span className="font-bold leading-snug">{item.title}</span>
        {item.excerpt && (
          <span className="line-clamp-2 text-sm text-muted">{item.excerpt}</span>
        )}
      </span>
    </Link>
  );
}
