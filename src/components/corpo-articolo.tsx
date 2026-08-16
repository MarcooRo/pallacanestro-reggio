// Impaginazione di un articolo nostro: un blocco per tipo, niente
// dangerouslySetInnerHTML. Il testo arriva da src/lib/news/blocchi.ts già
// validato, quindi qui non c'è markup da sanificare — solo tipografia.
// Anche il markdown passa da un albero di nodi (src/lib/news/markdown.ts),
// mai da una stringa di HTML.
//
// Lo usano sia /news/[slug] sia l'anteprima in /admin/news/[id]: quello che
// vede l'admin prima di pubblicare è esattamente quello che va online.
//
// Il componente resta sincrono: foto e dati dei widget si risolvono prima,
// nella pagina che lo monta (risolviImmaginiCorpo, risolviGrafici).

import Image from "next/image";
import { Fragment } from "react";

import { Markdown } from "@/src/components/markdown";
import type { Blocco } from "@/src/lib/news/blocchi";
import type { DatiGrafici } from "@/src/lib/news/grafici/dati";
import { getGrafico } from "@/src/lib/news/grafici/registry";
import type { ImmaginiCorpo } from "@/src/lib/news/immagini";

export function CorpoArticolo({
  blocchi,
  immagini = {},
  grafici = {},
}: {
  blocchi: Blocco[];
  /** assetId → foto, da risolviImmaginiCorpo(). */
  immagini?: ImmaginiCorpo;
  /** posizione del blocco → widget risolto, da risolviGrafici(). */
  grafici?: DatiGrafici;
}) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
      {blocchi.map((blocco, i) => {
        switch (blocco.t) {
          case "md":
            return <Markdown key={i} testo={blocco.testo} />;
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
              <figure
                key={i}
                // "Piena": la foto esce dai margini del testo (il padding
                // della pagina è px-4, quindi -mx-4 la porta a filo bordo).
                className={
                  blocco.piena
                    ? "my-2 -mx-4 flex w-[calc(100%+2rem)] flex-col gap-1.5"
                    : "my-1 flex flex-col gap-1.5"
                }
              >
                <Image
                  src={foto.url}
                  // L'alt descrive la foto (caption della libreria); la
                  // didascalia è un'altra cosa e si legge sotto.
                  alt={foto.caption ?? ""}
                  width={foto.width ?? 1080}
                  height={foto.height ?? 810}
                  sizes={
                    blocco.piena
                      ? "(min-width: 1024px) 704px, 100vw"
                      : "(min-width: 1024px) 672px, 100vw"
                  }
                  className={
                    blocco.piena
                      ? "h-auto w-full object-cover"
                      : "taglio-sm h-auto w-full object-cover"
                  }
                />
                {blocco.didascalia && (
                  <figcaption
                    className={
                      blocco.piena
                        ? "px-4 text-xs text-muted"
                        : "text-xs text-muted"
                    }
                  >
                    {blocco.didascalia}
                  </figcaption>
                )}
              </figure>
            );
          }
          case "galleria": {
            // Le foto sparite si saltano; sotto le due resta un'immagine
            // sola, che è comunque meglio di un carosello vuoto.
            const foto = blocco.assetIds
              .map((id) => immagini[id])
              .filter((f) => f !== undefined);
            if (foto.length === 0) return null;
            return (
              <figure key={i} className="my-1 flex flex-col gap-1.5">
                {/* Scorre col dito: scroll-snap CSS, nessun JavaScript.
                    Il -mx-4/px-4 fa uscire la striscia dal margine del testo,
                    così si vede che c'è dell'altro oltre il bordo. */}
                <div className="carosello -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1">
                  {foto.map((f, j) => (
                    <div
                      key={j}
                      className="taglio-sm relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden bg-surface"
                    >
                      <Image
                        src={f.url}
                        alt={f.caption ?? ""}
                        fill
                        sizes="(min-width: 1024px) 572px, 85vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                {(blocco.didascalia || foto.length > 1) && (
                  <figcaption className="flex items-baseline justify-between gap-2 text-xs text-muted">
                    <span>{blocco.didascalia}</span>
                    {foto.length > 1 && (
                      <span className="eyebrow shrink-0 !text-[0.625rem]">
                        {foto.length} foto · scorri →
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            );
          }
          case "grafico": {
            const risolto = grafici[i];
            const def = risolto ? getGrafico(risolto.tipo) : null;
            // Dato sparito (partita cancellata) o widget tolto dal registry:
            // il blocco si salta, l'articolo resta leggibile.
            if (!risolto || !def || risolto.dati === null) return null;
            return <Fragment key={i}>{def.render(risolto.params, risolto.dati)}</Fragment>;
          }
          default:
            return <p key={i}>{blocco.testo}</p>;
        }
      })}
    </div>
  );
}
