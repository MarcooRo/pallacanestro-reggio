// Tessera del mosaico: la foto a tutto riquadro, il titolo sopra. È la
// forma che dà ritmo alla pagina News — le tessere non hanno tutte la
// stessa misura, e la griglia le incastra in un disegno che cambia.

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { orario } from "@/src/lib/date";
import { fonteDiCasa, nomeFonte } from "@/src/lib/news/etichette";
import type { NewsInLista } from "@/src/lib/news/queries";

export function NewsTessera({
  item,
  className = "",
  style,
  grande = false,
}: {
  item: NewsInLista;
  className?: string;
  style?: CSSProperties;
  /** La tessera che occupa due righe: titolo più grande e occhiello completo */
  grande?: boolean;
}) {
  const diCasa = fonteDiCasa(item.source);
  return (
    <Link
      href={`/news/${item.slug ?? item.id}`}
      className={`taglio-sm card group relative flex overflow-hidden transition-colors hover:border-brand ${
        diCasa ? "border-l-[3px] border-l-brand-vivid" : ""
      } ${className}`}
      style={style}
    >
      {item.copertina && (
        <Image
          src={item.copertina}
          alt=""
          fill
          sizes={
            grande
              ? "(min-width: 1024px) 34rem, 100vw"
              : "(min-width: 1024px) 24rem, 100vw"
          }
          // Lo zoom lento è l'unico movimento della pagina oltre all'entrata:
          // sotto prefers-reduced-motion la regola globale lo azzera
          className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
      )}
      {/* Velo scuro: il titolo deve leggersi anche su una foto chiara, e
          nelle tessere piccole il testo sale più in alto sulla foto */}
      <span
        className={`absolute inset-0 bg-gradient-to-t ${
          grande
            ? "from-black/92 via-black/45 to-black/5"
            : "from-black/95 via-black/70 to-black/15"
        }`}
      />
      <span className="relative mt-auto flex flex-col gap-1.5 p-4">
        <span className="eyebrow !text-[0.625rem]">
          <span className={diCasa ? "font-bold !text-brand-vivid" : ""}>
            {nomeFonte[item.source] ?? item.source}
          </span>
          {/* Nelle tessere piccole la categoria manda l'occhiello a capo e
              spinge giù il titolo: lì restano solo fonte e ora */}
          {grande && item.category ? ` · ${item.category}` : ""} ·{" "}
          {orario(item.publishedAt)}
        </span>
        <span
          className={`leading-tight font-bold text-balance ${
            grande ? "line-clamp-4 text-xl lg:text-2xl" : "line-clamp-3"
          }`}
        >
          {item.title}
        </span>
      </span>
    </Link>
  );
}
