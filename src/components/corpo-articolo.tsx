// Impaginazione di un articolo nostro: un blocco per tipo, niente
// dangerouslySetInnerHTML. Il testo arriva da src/lib/news/blocchi.ts già
// validato, quindi qui non c'è markup da sanificare — solo tipografia.
//
// Lo usano sia /news/[slug] sia l'anteprima in /admin/news/[id]: quello che
// vede l'admin prima di pubblicare è esattamente quello che va online.

import type { Blocco } from "@/src/lib/news/blocchi";

export function CorpoArticolo({ blocchi }: { blocchi: Blocco[] }) {
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
          default:
            return <p key={i}>{blocco.testo}</p>;
        }
      })}
    </div>
  );
}
