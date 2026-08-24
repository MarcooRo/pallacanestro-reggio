// Riquadro news: foto sopra, titolo sotto. Sta subito dopo l'apertura,
// dove le notizie sono ancora fresche e la foto aiuta a sceglierle.

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { soloOra } from "@/src/lib/date";
import { fonteDiCasa, nomeFonte } from "@/src/lib/news/etichette";
import type { NewsInLista } from "@/src/lib/news/queries";

export function NewsRiquadro({
  item,
  className = "",
  style,
  riempi = false,
}: {
  item: NewsInLista;
  className?: string;
  style?: CSSProperties;
  /** In una colonna stirata è la FOTO a crescere, non il vuoto tra
      titolo e data: il riquadro riempie l'altezza che gli danno. */
  riempi?: boolean;
}) {
  const diCasa = fonteDiCasa(item.source);
  return (
    <Link
      href={`/news/${item.slug ?? item.id}`}
      className={`taglio-sm card group flex flex-col overflow-hidden transition-colors hover:border-brand ${
        diCasa ? "border-l-[3px] border-l-brand-vivid" : ""
      } ${className}`}
      style={style}
    >
      {item.copertina && (
        <span
          className={`relative block w-full ${
            riempi ? "min-h-40 flex-1" : "aspect-[16/9]"
          }`}
        >
          <Image
            src={item.copertina}
            alt=""
            fill
            sizes="(min-width: 1024px) 20rem, 100vw"
            className="object-cover"
          />
        </span>
      )}
      <span
        className={`flex flex-col gap-1.5 p-3.5 ${riempi ? "" : "flex-1"}`}
      >
        <span className="eyebrow">
          <span className={diCasa ? "font-bold !text-brand-vivid" : ""}>
            {nomeFonte[item.source] ?? item.source}
          </span>
        </span>
        <span className="leading-snug font-bold transition-colors group-hover:text-brand-vivid">
          {item.title}
        </span>
        <span className="eyebrow mt-auto pt-1">
          {soloOra(item.publishedAt)}
        </span>
      </span>
    </Link>
  );
}
