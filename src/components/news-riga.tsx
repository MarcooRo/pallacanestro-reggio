// Riga d'archivio: titolo, fonte e data in piccolo, miniatura a destra.
// È la coda della pagina, dove si scorre per cercare: qui conta la
// densità, non la foto.

import Image from "next/image";
import Link from "next/link";

import { soloOra } from "@/src/lib/date";
import { fonteDiCasa, nomeFonte } from "@/src/lib/news/etichette";
import type { NewsInLista } from "@/src/lib/news/queries";

export function NewsRiga({
  item,
  className = "",
  fotoSempre = false,
}: {
  item: NewsInLista;
  className?: string;
  /** Miniatura anche sul telefono: in Qui Reggio la foto fa parte della
   *  notizia, solo nelle code d'archivio si sacrifica alla densità. */
  fotoSempre?: boolean;
}) {
  const diCasa = fonteDiCasa(item.source);
  return (
    <Link
      href={`/news/${item.slug ?? item.id}`}
      // Il filo a sinistra è sempre lì, trasparente: acceso o spento la
      // riga non si sposta di un pixel
      className={`group flex items-center gap-3 border-l-2 border-b border-b-border py-2.5 pl-3 transition-colors hover:bg-surface ${
        diCasa ? "border-l-brand-vivid" : "border-l-transparent"
      } ${className}`}
    >
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
          {item.category ? ` · ${item.category}` : ""} ·{" "}
          {soloOra(item.publishedAt)}
        </span>
      </span>
      {item.copertina && (
        <Image
          src={item.copertina}
          alt=""
          width={104}
          height={66}
          className={`shrink-0 object-cover ${fotoSempre ? "" : "hidden sm:block"}`}
          style={{ width: 104, height: 66 }}
        />
      )}
    </Link>
  );
}
