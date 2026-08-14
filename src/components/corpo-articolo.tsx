// Impaginazione di un articolo nostro: un blocco per tipo, niente
// dangerouslySetInnerHTML. Il testo arriva da src/lib/news/blocchi.ts già
// validato, quindi qui non c'è markup da sanificare — solo tipografia.
//
// Lo usano sia /news/[slug] sia l'anteprima in /admin/news/[id]: quello che
// vede l'admin prima di pubblicare è esattamente quello che va online.

import Image from "next/image";

import type { Blocco } from "@/src/lib/news/blocchi";
import type { ImmaginiCorpo } from "@/src/lib/news/immagini";

export function CorpoArticolo({
  blocchi,
  immagini = {},
}: {
  blocchi: Blocco[];
  /** assetId → foto, da risolviImmaginiCorpo(). */
  immagini?: ImmaginiCorpo;
}) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
      {blocchi.map((blocco, i) => {
        switch (blocco.t) {
          case "sottotitolo":
            return (
              <h2 key={i} className="display mt-3 text-xl">
                {blocco.testo}
              </h2>
            );
          case "elenco":
            return (
              <ul key={i} className="flex flex-col gap-1.5 pl-5">
                {blocco.voci.map((voce, j) => (
                  <li key={j} className="list-disc">
                    {voce}
                  </li>
                ))}
              </ul>
            );
          case "citazione":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-brand pl-3 text-muted italic"
              >
                <p>{blocco.testo}</p>
                {blocco.chi && (
                  <cite className="eyebrow not-italic">— {blocco.chi}</cite>
                )}
              </blockquote>
            );
          case "immagine": {
            const foto = immagini[blocco.assetId];
            // Foto sparita dalla libreria: si salta il blocco invece di
            // lasciare un'immagine rotta in mezzo al testo.
            if (!foto) return null;
            return (
              <figure key={i} className="my-1 flex flex-col gap-1.5">
                <Image
                  src={foto.url}
                  // L'alt descrive la foto (caption della libreria); la
                  // didascalia è un'altra cosa e si legge sotto.
                  alt={foto.caption ?? ""}
                  width={foto.width ?? 1080}
                  height={foto.height ?? 810}
                  sizes="(min-width: 1024px) 672px, 100vw"
                  className="taglio-sm h-auto w-full object-cover"
                />
                {blocco.didascalia && (
                  <figcaption className="text-xs text-muted">
                    {blocco.didascalia}
                  </figcaption>
                )}
              </figure>
            );
          }
          default:
            return <p key={i}>{blocco.testo}</p>;
        }
      })}
    </div>
  );
}
