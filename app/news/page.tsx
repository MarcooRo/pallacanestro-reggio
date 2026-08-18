import type { Metadata } from "next";
import Link from "next/link";

import { NewsApertura } from "@/src/components/news-apertura";
import { NewsRiga } from "@/src/components/news-riga";
import { NewsRiquadro } from "@/src/components/news-riquadro";
import { Pillola } from "@/src/components/pillola";
import { chiaveGiorno, etichettaGiorno } from "@/src/lib/date";
import { fonteDiCasa } from "@/src/lib/news/etichette";
import {
  getNews,
  type FonteNews,
  type NewsInLista,
} from "@/src/lib/news/queries";

export const metadata: Metadata = { title: "News" };

// Di default si vede tutto, mescolato; i tag scelgono la fonte.
const FILTRI: { chiave: string; etichetta: string; fonte?: FonteNews }[] = [
  { chiave: "tutte", etichetta: "Tutte" },
  { chiave: "redazione", etichetta: "Redazione", fonte: "redazione" },
  { chiave: "reggio", etichetta: "Reggio", fonte: "pr_wordpress" },
  { chiave: "seriea", etichetta: "Serie A", fonte: "lba" },
];

// Quante notizie del giorno più recente stanno in riquadro prima che anche
// quel giorno passi a righe: di una giornata da quindici pezzi, quindici
// foto grandi sarebbero il muro di prima. Tre = una riga piena da lg, mai
// un riquadro spaiato in fondo alla griglia.
const RIQUADRI_MAX = 3;

interface Giorno {
  chiave: string;
  etichetta: string;
  /** Se quel giorno ha pubblicato anche Reggio: la banda accende il filo */
  diCasa: boolean;
  items: NewsInLista[];
}

function perGiorno(items: NewsInLista[]): Giorno[] {
  const giorni: Giorno[] = [];
  for (const item of items) {
    const chiave = chiaveGiorno(item.publishedAt);
    let giorno = giorni.at(-1);
    if (giorno?.chiave !== chiave) {
      giorno = {
        chiave,
        etichetta: etichettaGiorno(item.publishedAt),
        diCasa: false,
        items: [],
      };
      giorni.push(giorno);
    }
    giorno.diCasa ||= fonteDiCasa(item.source);
    giorno.items.push(item);
  }
  return giorni;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const attivo = FILTRI.find((x) => x.chiave === f) ?? FILTRI[0];
  const items = await getNews(50, attivo.fonte);

  // Ogni notizia sta sotto la banda del suo giorno, apertura compresa: la
  // scaletta per data è la spina dorsale della pagina. A cambiare è solo
  // la scala — il giorno più recente in grande, i precedenti a righe.
  const giorni = perGiorno(items);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 lg:max-w-5xl">
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

      {giorni.length === 0 ? (
        <p className="taglio-sm card flex flex-col gap-2 p-5 text-sm text-muted">
          Qui non c&apos;è ancora niente da leggere.
          <Link href="/news" className="eyebrow text-brand-vivid">
            vedi tutte le news →
          </Link>
        </p>
      ) : (
        giorni.map((giorno, i) => {
          // Il giorno più recente si apre in grande, gli altri sono righe
          const [apertura, ...resto] = i === 0 ? giorno.items : [];
          const riquadri = resto.slice(0, RIQUADRI_MAX);
          const righe = i === 0 ? resto.slice(RIQUADRI_MAX) : giorno.items;

          return (
            <section key={giorno.chiave} className="flex flex-col gap-2.5">
              {/* La banda del giorno: le news arrivano a grappoli, e i buchi
                  fra un giorno e l'altro sono un'informazione anche loro */}
              <div className="flex items-center gap-3 pt-1">
                <span className="eyebrow !text-foreground">
                  {giorno.etichetta}
                </span>
                {giorno.diCasa && (
                  <span className="h-px w-7 shrink-0 bg-brand-vivid" />
                )}
                <span className="h-px flex-1 bg-border" />
              </div>

              {apertura && <NewsApertura item={apertura} />}

              {riquadri.length > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {riquadri.map((n) => (
                    <NewsRiquadro key={n.id} item={n} />
                  ))}
                </div>
              )}

              {righe.length > 0 && (
                <div className="flex flex-col">
                  {righe.map((n) => (
                    <NewsRiga key={n.id} item={n} />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
