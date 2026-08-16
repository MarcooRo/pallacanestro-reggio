// Il rendering del blocco "md": nodi React costruiti dall'albero di
// src/lib/news/markdown.ts. Nessun dangerouslySetInnerHTML, qui e altrove —
// il testo arriva sempre come figlio di un elemento, quindi React lo stampa
// e basta. La tipografia è la stessa dei blocchi tipizzati: un articolo
// deve leggersi uguale che sia scritto a blocchi o in markdown.

import Link from "next/link";

import { analizzaMarkdown, type BloccoMd, type NodoInline } from "@/src/lib/news/markdown";

function Inline({ parti }: { parti: NodoInline[] }) {
  return (
    <>
      {parti.map((n, i) => {
        switch (n.tipo) {
          case "grassetto":
            return <strong key={i}>{n.testo}</strong>;
          case "corsivo":
            return <em key={i}>{n.testo}</em>;
          case "codice":
            return (
              <code key={i} className="score rounded-sm bg-surface-2 px-1 py-0.5 text-[0.9em]">
                {n.testo}
              </code>
            );
          case "link":
            // Interno: navigazione client, niente ricarica. Esterno: scheda
            // nuova e rel di sicurezza, come i rimandi alle fonti.
            return n.href.startsWith("/") ? (
              <Link key={i} href={n.href} className="font-semibold text-brand-vivid hover:underline">
                {n.testo}
              </Link>
            ) : (
              <a
                key={i}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-vivid hover:underline"
              >
                {n.testo}
              </a>
            );
          default:
            return <span key={i}>{n.testo}</span>;
        }
      })}
    </>
  );
}

function BloccoRender({ blocco }: { blocco: BloccoMd }) {
  switch (blocco.tipo) {
    case "titolo":
      return blocco.livello === 2 ? (
        <h2 className="display mt-3 text-xl">
          <Inline parti={blocco.parti} />
        </h2>
      ) : (
        <h3 className="text-base font-bold">
          <Inline parti={blocco.parti} />
        </h3>
      );
    case "elenco": {
      const voci = blocco.voci.map((parti, i) => (
        <li key={i} className={blocco.ordinato ? "list-decimal" : "list-disc"}>
          <Inline parti={parti} />
        </li>
      ));
      return blocco.ordinato ? (
        <ol className="flex flex-col gap-1.5 pl-5">{voci}</ol>
      ) : (
        <ul className="flex flex-col gap-1.5 pl-5">{voci}</ul>
      );
    }
    case "citazione":
      return (
        <blockquote className="border-l-2 border-brand pl-3 text-muted italic">
          <Inline parti={blocco.parti} />
        </blockquote>
      );
    case "riga":
      return <hr className="my-2 border-border" />;
    default:
      return (
        <p>
          <Inline parti={blocco.parti} />
        </p>
      );
  }
}

export function Markdown({ testo }: { testo: string }) {
  const blocchi = analizzaMarkdown(testo);
  return (
    <div className="flex flex-col gap-3">
      {blocchi.map((b, i) => (
        <BloccoRender key={i} blocco={b} />
      ))}
    </div>
  );
}
