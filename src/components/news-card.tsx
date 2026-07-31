// Card news: titolo, estratto, categoria, immagine. Link sempre alla
// fonte originale (il testo integrale non si ripubblica).

import Image from "next/image";

import type { news } from "@/src/db/schema";
import { soloOra } from "@/src/lib/date";

const nomeFonte: Record<string, string> = {
  lba: "Lega Basket",
  pr_wordpress: "Pallacanestro Reggiana",
};

export function NewsCard({ item }: { item: typeof news.$inferSelect }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="taglio-sm group flex gap-3 border border-border bg-surface p-3 transition-colors hover:border-brand"
    >
      {item.imageUrl && (
        <Image
          src={item.imageUrl}
          alt=""
          width={96}
          height={64}
          className="hidden shrink-0 object-cover grayscale transition-[filter] group-hover:grayscale-0 sm:block"
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
    </a>
  );
}
