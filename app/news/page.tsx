import type { Metadata } from "next";
import Link from "next/link";

import { NewsApertura } from "@/src/components/news-apertura";
import { NewsRiga } from "@/src/components/news-riga";
import { NewsRiquadro } from "@/src/components/news-riquadro";
import { NewsTessera } from "@/src/components/news-tessera";
import { Pillola } from "@/src/components/pillola";
import { fonteDiCasa } from "@/src/lib/news/etichette";
import { getNews, type FonteNews } from "@/src/lib/news/queries";

export const metadata: Metadata = { title: "News" };

// Di default si vede tutto, mescolato; i tag scelgono la fonte.
const FILTRI: { chiave: string; etichetta: string; fonte?: FonteNews }[] = [
  { chiave: "tutte", etichetta: "Tutte" },
  { chiave: "redazione", etichetta: "Redazione", fonte: "redazione" },
  { chiave: "reggio", etichetta: "Reggio", fonte: "pr_wordpress" },
  { chiave: "seriea", etichetta: "Serie A", fonte: "lba" },
];

// Il disegno del mosaico: una tessera alta a sinistra, due che le stanno
// accanto, tre sotto. Le misure sono fisse e ripetute apposta — è il ritmo
// a reggere la pagina, non l'ordine di arrivo delle notizie. Su telefono
// la griglia non c'è e le tessere si incolonnano: lì il ritmo lo fa
// l'altezza, che cala mano a mano che si scende.
const MOSAICO = [
  "h-64 sm:col-span-12 sm:row-span-2 sm:h-auto lg:col-span-7",
  "h-52 sm:col-span-6 sm:h-auto lg:col-span-5",
  "h-52 sm:col-span-6 sm:h-auto lg:col-span-5",
  "h-40 sm:col-span-4 sm:h-auto",
  "h-40 sm:col-span-4 sm:h-auto",
  "h-40 sm:col-span-4 sm:h-auto",
];

// Tre: da lg è la riga piena della striscia, e una quarta scheda spaiata
// lasciava mezzo riquadro rosso vuoto.
const STRISCIA_MAX = 3;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const attivo = FILTRI.find((x) => x.chiave === f) ?? FILTRI[0];
  const items = await getNews(50, attivo.fonte);

  const [apertura, ...resto] = items;
  const mosaico = resto.slice(0, MOSAICO.length);
  let coda = resto.slice(MOSAICO.length);

  // La striscia di Reggio esiste solo quando le fonti sono mescolate: è lì
  // per ripescare le notizie del club prima che affoghino fra quelle di
  // lega, e con un filtro attivo non ripescherebbe niente.
  const striscia = attivo.fonte
    ? []
    : coda.filter((n) => fonteDiCasa(n.source)).slice(0, STRISCIA_MAX);
  const inStriscia = new Set(striscia.map((n) => n.id));
  coda = coda.filter((n) => !inStriscia.has(n.id));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 lg:max-w-5xl">
      {/* Da lg titolo e filtri stanno sulla stessa riga: l'apertura comincia
          più in alto, che è tutto il punto di questa pagina */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="display text-3xl">News</h1>
        {/* quattro pillole a 390px: vanno a capo, non in overflow */}
        <div className="flex flex-wrap gap-2.5 pl-1">
          {FILTRI.map((filtro) => (
            <Pillola
              key={filtro.chiave}
              href={`/news?f=${filtro.chiave}`}
              attiva={filtro.chiave === attivo.chiave}
            >
              {filtro.etichetta}
            </Pillola>
          ))}
        </div>
      </div>

      {!apertura ? (
        <p className="taglio-sm card flex flex-col gap-2 p-5 text-sm text-muted">
          Qui non c&apos;è ancora niente da leggere.
          <Link href="/news" className="eyebrow text-brand-vivid">
            vedi tutte le news →
          </Link>
        </p>
      ) : (
        <>
          <NewsApertura item={apertura} />

          {mosaico.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 sm:auto-rows-[11.5rem] sm:grid-cols-12 lg:auto-rows-[12.5rem]">
              {mosaico.map((n, i) => (
                <NewsTessera
                  key={n.id}
                  item={n}
                  className={`sale ${MOSAICO[i]}`}
                  // Le tessere entrano a scaglioni, non tutte insieme: un
                  // gradino per tessera, come la home
                  style={{ animationDelay: `${0.05 * i}s` }}
                  grande={i === 0}
                />
              ))}
            </div>
          )}

          {striscia.length > 0 && (
            // La striscia rompe la colonna: fondo rosso spento, e si scorre
            // col dito sul telefono come i video in home
            <section className="taglio -mx-4 flex flex-col gap-3 bg-brand-tint px-4 py-5 sm:mx-0 sm:px-5">
              <div className="flex items-baseline justify-between">
                <h2 className="display text-2xl">Solo Reggio</h2>
                <Link
                  href="/news?f=reggio"
                  className="eyebrow text-brand-vivid"
                >
                  tutte →
                </Link>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
                {striscia.map((n) => (
                  <NewsRiquadro
                    key={n.id}
                    item={n}
                    className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto"
                  />
                ))}
              </div>
            </section>
          )}

          {coda.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="eyebrow">Archivio</h2>
              {/* Due colonne da lg: la coda è lunga, e in colonna sola
                  diventava lo scroll infinito che c'era prima */}
              <div className="grid lg:grid-cols-2 lg:gap-x-8">
                {coda.map((n) => (
                  <NewsRiga key={n.id} item={n} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
