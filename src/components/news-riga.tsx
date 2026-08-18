// Riga di archivio: l'orario a sinistra in mono, il titolo, la miniatura.
// La data non si ripete riga per riga — la dice la banda del giorno.

import Image from "next/image";
import Link from "next/link";

import { orario } from "@/src/lib/date";
import { fonteDiCasa, nomeFonte } from "@/src/lib/news/etichette";
import type { NewsInLista } from "@/src/lib/news/queries";

export function NewsRiga({ item }: { item: NewsInLista }) {
  const diCasa = fonteDiCasa(item.source);
  return (
    <Link
      href={`/news/${item.slug ?? item.id}`}
      // Il filo a sinistra è sempre lì, trasparente: acceso o spento la
      // riga non si sposta di un pixel
      className={`group flex items-center gap-3 border-l-2 border-b border-b-border py-2.5 pl-3 transition-colors hover:bg-surface sm:gap-4 ${
        diCasa ? "border-l-brand-vivid" : "border-l-transparent"
      }`}
    >
      <span className="score w-10 shrink-0 text-xs text-muted">
        {orario(item.publishedAt)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Su uno schermo largo la riga arriverebbe a 110 caratteri: la
            misura si ferma dove un titolo si legge ancora in un colpo */}
        <span className="max-w-[68ch] leading-snug font-semibold transition-colors group-hover:text-brand-vivid">
          {item.title}
        </span>
        <span className="eyebrow !text-[0.625rem]">
          <span className={diCasa ? "font-bold !text-brand-vivid" : ""}>
            {nomeFonte[item.source] ?? item.source}
          </span>
          {item.category ? ` · ${item.category}` : ""}
        </span>
      </span>
      {item.copertina && (
        <Image
          src={item.copertina}
          alt=""
          width={104}
          height={66}
          className="hidden shrink-0 object-cover sm:block"
          style={{ width: 104, height: 66 }}
        />
      )}
    </Link>
  );
}
