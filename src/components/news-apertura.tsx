// L'apertura della pagina News: la notizia più recente (o quella fissata
// in cima) alla scala che merita. È l'unico blocco della pagina con una
// foto grande: tutto il resto scende di corpo mano a mano che invecchia.

import Image from "next/image";
import Link from "next/link";

import { soloOra } from "@/src/lib/date";
import { fonteDiCasa, nomeFonte } from "@/src/lib/news/etichette";
import type { NewsInLista } from "@/src/lib/news/queries";

export function NewsApertura({ item }: { item: NewsInLista }) {
  const diCasa = fonteDiCasa(item.source);
  return (
    <Link
      href={`/news/${item.slug ?? item.id}`}
      className={`taglio card sale group grid overflow-hidden transition-colors hover:border-brand lg:grid-cols-[7fr_5fr] ${
        // Il filo rosso a sinistra dice "questa è roba di Reggio", come
        // sulla riga di Reggio nelle card partita
        diCasa ? "border-l-[3px] border-l-brand-vivid" : ""
      }`}
    >
      {item.copertina && (
        <span className="relative block aspect-[16/10] w-full lg:aspect-auto lg:min-h-[19rem]">
          <Image
            src={item.copertina}
            alt=""
            fill
            sizes="(min-width: 1024px) 36rem, 100vw"
            className="object-cover"
            priority
          />
        </span>
      )}
      <span className="flex flex-col justify-center gap-3 p-5 lg:p-7">
        <span className="eyebrow">
          <span className={diCasa ? "font-bold !text-brand-vivid" : ""}>
            {nomeFonte[item.source] ?? item.source}
          </span>
          {item.category ? ` · ${item.category}` : ""}
        </span>
        {/* Corpo grande ma non in maiuscolo: il titolo di una notizia si
            legge, non si urla — il display corsivo resta ai titoli di pagina */}
        <span className="text-2xl leading-[1.12] font-bold tracking-tight text-balance sm:text-3xl lg:text-[2.1rem]">
          {item.title}
        </span>
        {item.excerpt && (
          <span className="line-clamp-3 text-sm text-muted lg:text-base">
            {item.excerpt}
          </span>
        )}
        <span className="eyebrow flex items-center gap-2">
          {soloOra(item.publishedAt)}
          <span className="text-brand-vivid transition-transform group-hover:translate-x-1">
            leggi →
          </span>
        </span>
      </span>
    </Link>
  );
}
