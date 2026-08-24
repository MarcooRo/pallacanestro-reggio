import Link from "next/link";

import { NewsApertura } from "@/src/components/news-apertura";
import { NewsCard } from "@/src/components/news-card";
import { NewsRiga } from "@/src/components/news-riga";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { VideoCard } from "@/src/components/video-card";
import { soloOra } from "@/src/lib/date";
import { getProfilo } from "@/src/lib/identita/sessione";
import { fonteDiCasa } from "@/src/lib/news/etichette";
import { getNews, type NewsInLista } from "@/src/lib/news/queries";
import {
  getProssimaPartita,
  getUltimaPagella,
  getVotazioneAperta,
} from "@/src/lib/partite/queries";
import { getVideoHome } from "@/src/lib/video/queries";

// La home è per tutti, dal primo tap: nessuna vetrina, nessun accesso.
// L'identità anonima nasce solo quando si partecipa (voto, reazioni…).
//
// Dal 24/08/2026 la home è un giornale: prima le notizie di Reggio, poi
// il resto del campionato. Testata con l'apertura e a fianco la colonna
// della partita (prossima gara + il pezzo della redazione), sotto la
// fascia Qui Reggio su due colonne coi video a destra, in coda tutti
// gli altri articoli. Le gerarchie sono pensate per il desktop; il
// telefono incolonna e avrà le sue dopo.
export default async function HomePage() {
  return <HomeContenuti />;
}

// Quante notizie entrano in ogni spazio: Qui Reggio quattro su due
// colonne, la coda chiude a coppie con tutto quello che resta.
const QUI_REGGIO = 4;
const CODA = 10;

// Il pezzo della redazione non segue la cronaca: ha il suo box e ci
// resta finché non ne esce uno più nuovo, anche dopo settimane. Uno
// alla volta: è la firma della casa, non un flusso.
const SPAZIO_REDAZIONE = 1;

async function HomeContenuti() {
  const profilo = await getProfilo();
  const [votazione, prossima, ultima, redazione, tutte, video] =
    await Promise.all([
      getVotazioneAperta(),
      getProssimaPartita(),
      getUltimaPagella(),
      // Query separata: gli articoli nostri non devono competere per
      // freschezza con la cronaca — lo spazio è loro comunque.
      getNews(SPAZIO_REDAZIONE, "redazione"),
      getNews(40),
      getVideoHome(),
    ]);

  // Dal mucchio si spartiscono gli spazi, senza mai ripetere una notizia.
  const usate = new Set(redazione.map((n) => n.id));
  const prendi = (
    quante: number,
    vaBene: (n: NewsInLista) => boolean = () => true,
  ) => {
    const scelte = tutte.filter((n) => !usate.has(n.id) && vaBene(n)).slice(0, quante);
    for (const n of scelte) usate.add(n.id);
    return scelte;
  };

  // L'apertura è la notizia del giorno: quella fissata dall'admin se c'è
  // (la query le mette in testa), altrimenti la più fresca di Reggio,
  // altrimenti la più fresca e basta.
  let [testata] = prendi(1, (n) => n.isPinned || fonteDiCasa(n.source));
  if (!testata) [testata] = prendi(1);
  const quiReggio = prendi(QUI_REGGIO, (n) => fonteDiCasa(n.source));
  const coda = prendi(CODA);

  return (
    // Ogni sezione dopo la prima è separata da un divisorio e respira.
    // Da lg il margine laterale cresce (px-10): coi 16px del telefono la
    // pagina toccava quasi i bordi delle finestre non a tutto schermo.
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 px-4 py-6 lg:max-w-5xl lg:px-10 [&>section]:py-6 [&>section+section]:border-t [&>section+section]:border-border">
      {profilo?.nickname && (
        <p className="eyebrow sale">Ciao, {profilo.nickname}</p>
      )}

      {/* Votazione aperta: la striscia resta in cima a tutto — il voto è
          il prodotto, il giornale gli sta intorno. */}
      {votazione && (
        <section className="sale flex flex-col gap-3">
          <Link
            href={`/partite/${votazione.id}`}
            className="taglio display flex items-baseline justify-between bg-brand px-4 py-3.5 text-xl text-on-brand transition-colors hover:bg-brand-hover"
          >
            <span>Si vota, ora</span>
            <span className="eyebrow">vota il migliore →</span>
          </Link>
        </section>
      )}

      {/* ── Testata: l'apertura alla scala che merita con accanto la
          prossima partita — il tabellone sta in testata come sui
          giornali sportivi. ── */}
      <section className="sale sale-2 flex flex-col gap-2.5">
        {/* Niente items-start: l'apertura si stira all'altezza della
            colonna partita+redazione, la foto cresce e il buco sparisce */}
        <div className="grid gap-2.5 lg:grid-cols-[2fr_1fr]">
          {testata && <NewsApertura item={testata} />}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-2xl">Prossima partita</h2>
              <Link href="/calendario" className="eyebrow text-brand-vivid">
                calendario →
              </Link>
            </div>
            {prossima ? (
              <PartitaCard partita={prossima} />
            ) : (
              <p className="taglio-sm card p-4 text-sm text-muted">
                Nessuna partita di Reggio pianificata. Guarda il{" "}
                <Link
                  href="/calendario"
                  className="font-bold text-brand-vivid underline"
                >
                  calendario
                </Link>{" "}
                per tutte le altre.
              </p>
            )}

            {/* Il pezzo della redazione sta sotto il tabellone: card
                compatta e testuale — la voce della casa si riconosce dal
                fondo rosso spento e dall'occhiello, non da una foto che
                si mangia la colonna. Un pezzo alla volta, l'ultimo, che
                non scivola via con la cronaca. */}
            {redazione.length > 0 && (
              <Link
                href={`/news/${redazione[0].slug ?? redazione[0].id}`}
                className="taglio group flex flex-col gap-2 border-l-[3px] border-l-brand-vivid bg-brand-tint p-4"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="eyebrow font-bold !text-brand-vivid">
                    Dalla redazione
                  </span>
                  <span className="eyebrow shrink-0">
                    {soloOra(redazione[0].publishedAt)}
                  </span>
                </span>
                <span className="leading-snug font-bold text-balance transition-colors group-hover:text-brand-vivid">
                  {redazione[0].title}
                </span>
                {redazione[0].excerpt && (
                  <span className="line-clamp-2 text-sm text-muted">
                    {redazione[0].excerpt}
                  </span>
                )}
                <span className="eyebrow text-brand-vivid transition-transform group-hover:translate-x-1">
                  leggi →
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Seconda riga: Qui Reggio largo due colonne coi suoi quattro
          articoli, i video nella terza. Sul telefono si incolonna. ── */}
      <section className="sale sale-3 grid gap-8 lg:grid-cols-3 lg:gap-6">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Qui Reggio</h2>
            <Link href="/news?f=reggio" className="eyebrow text-brand-vivid">
              tutte →
            </Link>
          </div>
          {quiReggio.length > 0 ? (
            // Quattro articoli a coppie: due colonne di righe, come
            // l'archivio della pagina News
            <div className="grid lg:grid-cols-2 lg:gap-x-6">
              {quiReggio.map((n) => (
                <NewsRiga key={n.id} item={n} />
              ))}
            </div>
          ) : (
            <p className="taglio-sm card p-4 text-sm text-muted">
              Nessun&apos;altra notizia da Reggio, per ora.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Video</h2>
            <Link href="/video" className="eyebrow text-brand-vivid">
              tutti →
            </Link>
          </div>
          {/* Sul telefono i video scorrono col dito come prima. Nella
              colonna desktop solo il più fresco ha la miniatura grande,
              gli altri sono righe compatte: tre card piene impilate
              spingevano la coda della pagina un metro più in basso. */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
            {video.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                className="w-[82%] shrink-0 snap-start"
              />
            ))}
          </div>
          <div className="hidden flex-col gap-2.5 lg:flex">
            {video.map((v, i) => (
              <VideoCard key={v.videoId} video={v} compatta={i > 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ── La coda: tutti gli altri articoli, di qualunque fonte, a
          coppie fino al limite — per il resto c'è la pagina News. ── */}
      {coda.length > 0 && (
        <section className="sale sale-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Tutte le news</h2>
            <Link href="/news" className="eyebrow text-brand-vivid">
              tutte →
            </Link>
          </div>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {coda.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        </section>
      )}

      {/* L'ultima pagella fa da contesto SOLO mentre si vota:
          "guarda il verdetto scorso, ora tocca a te". */}
      {votazione && ultima && (
        <section className="sale sale-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">L&apos;ultima pagella</h2>
            <Link href={`/partite/${ultima.partita.id}`} className="eyebrow text-brand-vivid">
              tutta →
            </Link>
          </div>
          <p className="eyebrow">
            {ultima.partita.homeTeam} – {ultima.partita.awayTeam}
            {ultima.partita.status === "finished"
              ? ` · ${ultima.partita.homeScore}-${ultima.partita.awayScore}`
              : ""}
          </p>
          <Pagella righe={ultima.pagella} compatta />
        </section>
      )}
    </main>
  );
}
