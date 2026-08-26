import Image from "next/image";
import Link from "next/link";

import { LogoClub } from "@/src/components/logo-club";
import { NewsRiga } from "@/src/components/news-riga";
import { NewsRiquadro } from "@/src/components/news-riquadro";
import { NewsTessera } from "@/src/components/news-tessera";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { VideoCard } from "@/src/components/video-card";
import { etichettaStagione, soloOra } from "@/src/lib/date";
import { getProfilo } from "@/src/lib/identita/sessione";
import { getClassificaCampionato } from "@/src/lib/classifica/campionato";
import { fonteDiCasa, nomeFonte } from "@/src/lib/news/etichette";
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
// Dal 24/08/2026 la home è un giornale, largo (7xl, solo qui): testata a
// tre colonne (hero fotografico | redazione | partita col voto sotto),
// poi Qui Reggio | video | classifica, in coda tutti gli altri articoli.
// Le gerarchie sono pensate per il desktop; il telefono incolonna e
// avrà le sue dopo.
export default async function HomePage() {
  return <HomeContenuti />;
}

// Quante notizie entrano in ogni spazio: Qui Reggio tre — la più
// fresca grande, le altre due piccole — la coda chiude con tutto
// quello che resta.
const QUI_REGGIO = 3;
const CODA = 12;

// L'apertura è il pezzo della redazione: è il contenuto più nostro che
// c'è (testo scritto in casa, foto dalla libreria) e non segue la
// cronaca — resta in testata finché non ne esce uno più nuovo.
const SPAZIO_REDAZIONE = 1;

// Quante squadre nel box classifica: sei righe stanno all'altezza
// delle tre righe di Qui Reggio; se Reggio è più giù si aggiunge in
// fondo, dopo i puntini.
const SQUADRE_CLASSIFICA = 6;

// Il titolo di sezione con la firma della casa: il cuneo rosso
// inclinato, lo stesso taglio dei tag e del bottone play.
function TitoloSezione({
  titolo,
  href,
  link,
}: {
  titolo: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="display flex items-center gap-2.5 text-2xl">
        <span aria-hidden className="h-5 w-1.5 shrink-0 -skew-x-[14deg] bg-brand" />
        {titolo}
      </h2>
      {href && link && (
        <Link href={href} className="eyebrow shrink-0 text-brand-vivid">
          {link} →
        </Link>
      )}
    </div>
  );
}

// L'apertura come manchette: la foto a tutto riquadro, il titolo alla
// scala massima sopra il velo scuro — la forma delle tessere, portata
// alla misura di un hero.
function Apertura({ item }: { item: NewsInLista }) {
  const diCasa = fonteDiCasa(item.source);
  return (
    <Link
      href={`/news/${item.slug ?? item.id}`}
      className={`taglio card group relative flex min-h-[22rem] overflow-hidden transition-colors hover:border-brand lg:col-span-8 lg:min-h-[30rem] ${
        diCasa ? "border-l-[3px] border-l-brand-vivid" : ""
      }`}
    >
      {item.copertina && (
        <Image
          src={item.copertina}
          alt=""
          fill
          sizes="(min-width: 1024px) 40rem, 100vw"
          priority
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 to-black/5" />
      <span className="relative mt-auto flex flex-col gap-2.5 p-5 lg:p-7">
        <span className="eyebrow">
          <span className={diCasa ? "font-bold !text-brand-vivid" : ""}>
            {nomeFonte[item.source] ?? item.source}
          </span>
          {item.category ? ` · ${item.category}` : ""}
        </span>
        <span className="text-3xl leading-[1.05] font-bold tracking-tight text-balance sm:text-4xl">
          {item.title}
        </span>
        {item.excerpt && (
          <span className="hidden max-w-[52ch] text-sm text-muted lg:line-clamp-2">
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

async function HomeContenuti() {
  const profilo = await getProfilo();
  const [votazione, prossima, ultima, redazione, tutte, video, classifica] =
    await Promise.all([
      getVotazioneAperta(),
      getProssimaPartita(),
      getUltimaPagella(),
      // Query separata: gli articoli nostri non devono competere per
      // freschezza con la cronaca — lo spazio è loro comunque.
      getNews(SPAZIO_REDAZIONE, "redazione"),
      getNews(40),
      getVideoHome(),
      getClassificaCampionato(),
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

  // L'apertura è SEMPRE il pezzo della redazione, quando c'è. Senza,
  // si ripiega sulla notizia del giorno: quella fissata dall'admin
  // (la query le mette in testa), poi la più fresca di Reggio, poi la
  // più fresca e basta.
  let testata: NewsInLista | undefined = redazione[0];
  if (!testata) [testata] = prendi(1, (n) => n.isPinned || fonteDiCasa(n.source));
  if (!testata) [testata] = prendi(1);
  const quiReggio = prendi(QUI_REGGIO, (n) => fonteDiCasa(n.source));
  const coda = prendi(CODA);

  // Il box classifica: le prime otto, e Reggio ripescata se sta sotto.
  const inTesta = classifica?.righe.slice(0, SQUADRE_CLASSIFICA) ?? [];
  const reggioFuori =
    classifica?.righe.find((r) => r.reggio && !inTesta.includes(r)) ?? null;

  return (
    // Ogni sezione dopo la prima è separata da un divisorio e respira.
    // Da lg il margine laterale cresce (px-10): coi 16px del telefono la
    // pagina toccava quasi i bordi delle finestre non a tutto schermo.
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 px-4 py-6 lg:max-w-7xl lg:px-10 [&>section]:py-6 [&>section+section]:border-t [&>section+section]:border-border">
      {profilo?.nickname && (
        <p className="eyebrow sale">Ciao, {profilo.nickname}</p>
      )}

      {/* ── Testata: l'apertura da manchette e la colonna di destra con
          la partita sopra e il pezzo della redazione sotto. Da lg le
          colonne prendono lo stesso gap della riga sotto: hero e rail
          appiccicati a 10px soffocavano, e così il bordo destro
          dell'apertura casca a piombo su quello di Qui Reggio. ── */}
      <section className="sale sale-2 grid gap-2.5 lg:grid-cols-12 lg:gap-x-6">
        {testata && <Apertura item={testata} />}

        <div className="flex flex-col gap-3 lg:col-span-4">
          <TitoloSezione
            titolo="Prossima partita"
            href="/calendario"
            link="calendario"
          />
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
          {/* Sotto la partita, la sezione del voto — il prodotto della
              casa. Tre stati: finestra aperta (si vota), pagella
              pubblicata (il verdetto), attesa (il voto apre a fine
              gara). mt-auto: se la colonna avanza sull'apertura, il
              respiro sta in mezzo. */}
          <div className="mt-auto flex flex-col gap-3 pt-3">
            <TitoloSezione titolo="Il voto" href="/voto" link="tutte" />
            {votazione ? (
              <Link
                href={`/partite/${votazione.id}`}
                className="taglio display flex items-baseline justify-between bg-brand px-4 py-3.5 text-xl text-on-brand transition-colors hover:bg-brand-hover"
              >
                <span>Si vota, ora</span>
                <span className="eyebrow">vota il migliore →</span>
              </Link>
            ) : ultima ? (
              <Link
                href={`/partite/${ultima.partita.id}`}
                className="taglio group flex flex-col gap-1 border-l-[3px] border-l-brand-vivid bg-brand-tint px-4 py-3"
              >
                <span className="eyebrow font-bold !text-brand-vivid">
                  L&apos;ultima pagella
                </span>
                <span className="text-sm leading-snug font-bold transition-colors group-hover:text-brand-vivid">
                  {ultima.partita.homeTeam} – {ultima.partita.awayTeam}
                  {ultima.partita.status === "finished"
                    ? ` · ${ultima.partita.homeScore}-${ultima.partita.awayScore}`
                    : ""}
                </span>
                <span className="eyebrow text-brand-vivid">
                  il migliore secondo la curva →
                </span>
              </Link>
            ) : (
              <p className="taglio-sm card p-4 text-sm text-muted">
                Il voto apre al fischio finale: a fine gara qui si sceglie
                il migliore in campo.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Seconda riga: la cronaca di Reggio a tessere — la notizia
          più fresca grande a sinistra, le altre due impilate accanto —
          e a destra la classifica del campionato. La griglia si stira
          all'altezza della classifica: sono le foto a crescere. ── */}
      <section className="sale sale-3 grid gap-8 lg:grid-cols-3 lg:gap-6">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <TitoloSezione titolo="Qui Reggio" href="/news?f=reggio" link="tutte" />
          {quiReggio.length > 0 ? (
            <div className="grid flex-1 gap-2.5 lg:grid-cols-2 lg:grid-rows-2">
              <NewsTessera
                item={quiReggio[0]}
                grande
                className="min-h-[16rem] lg:row-span-2 lg:min-h-[22rem]"
              />
              {quiReggio.slice(1).map((n) => (
                <NewsTessera key={n.id} item={n} className="min-h-[10rem]" />
              ))}
            </div>
          ) : (
            <p className="taglio-sm card p-4 text-sm text-muted">
              Nessun&apos;altra notizia da Reggio, per ora.
            </p>
          )}
        </div>

        {classifica && (
          <div className="flex flex-col gap-3">
            <TitoloSezione titolo="Classifica" href="/classifica" link="tutta" />
            <div className="tabellone taglio-sm flex flex-1 flex-col">
              <div className="fascia flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
                <span className="truncate font-bold">
                  {etichettaStagione(classifica.seasonYear)}
                </span>
                {classifica.giornata && (
                  <span className="shrink-0">{classifica.giornata}</span>
                )}
              </div>
              <ol className="flex flex-1 flex-col py-1">
                {inTesta.map((r) => (
                  <li key={r.lbaTeamId} className="flex flex-1">
                    <Link
                      href={r.reggio ? "/giocatori" : `/squadre/${r.lbaTeamId}`}
                      className={`flex w-full items-center gap-2.5 border-l-2 px-2.5 py-1.5 transition-colors hover:bg-surface ${
                        r.reggio
                          ? "border-l-brand-vivid bg-brand-tint"
                          : "border-l-transparent"
                      }`}
                    >
                      <span
                        className={`score w-5 text-center text-sm ${
                          r.reggio ? "font-bold text-brand-vivid" : "text-muted"
                        }`}
                      >
                        {r.position}
                      </span>
                      <LogoClub logoKey={r.logoKey} misura="sm" />
                      <span
                        className={`min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-tight ${
                          r.reggio ? "text-brand-vivid" : ""
                        }`}
                      >
                        {r.teamName}
                      </span>
                      <span
                        className={`score w-7 shrink-0 text-right text-sm font-bold ${
                          r.reggio ? "text-brand-vivid" : ""
                        }`}
                      >
                        {r.points}
                      </span>
                    </Link>
                  </li>
                ))}
                {/* Reggio non molla la classifica nemmeno quando sta
                    sotto la sesta: si ripesca dopo i puntini */}
                {reggioFuori && (
                  <li>
                    <span aria-hidden className="block px-10 py-0.5 text-muted">
                      ⋯
                    </span>
                    <Link
                      href="/giocatori"
                      className="flex items-center gap-2.5 border-l-2 border-l-brand-vivid bg-brand-tint px-2.5 py-1.5 transition-colors hover:bg-surface"
                    >
                      <span className="score w-5 text-center text-sm font-bold text-brand-vivid">
                        {reggioFuori.position}
                      </span>
                      <LogoClub logoKey={reggioFuori.logoKey} misura="sm" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-tight text-brand-vivid">
                        {reggioFuori.teamName}
                      </span>
                      <span className="score w-7 shrink-0 text-right text-sm font-bold text-brand-vivid">
                        {reggioFuori.points}
                      </span>
                    </Link>
                  </li>
                )}
              </ol>
            </div>
          </div>
        )}
      </section>

      {/* ── La banda dei video: tre alla pari, stessa misura — la griglia
          li stira alla stessa altezza. Sul telefono scorrono col dito. ── */}
      {video.length > 0 && (
        <section className="sale sale-3 flex flex-col gap-3">
          <TitoloSezione titolo="Video" href="/video" link="tutti" />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
            {video.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                className="w-[82%] shrink-0 snap-start lg:w-auto"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── La coda: tutti gli altri articoli, di qualunque fonte. Non
          un muro di card: le prime tre hanno la foto, il resto è la
          lista d'archivio a due colonne — si scorre con l'occhio. ── */}
      {coda.length > 0 && (
        <section className="sale sale-4 flex flex-col gap-4">
          <TitoloSezione titolo="Tutte le news" href="/news" link="tutte" />
          <div className="grid gap-2.5 lg:grid-cols-3">
            {coda.slice(0, 3).map((n) => (
              <NewsRiquadro key={n.id} item={n} />
            ))}
          </div>
          {coda.length > 3 && (
            <div className="grid lg:grid-cols-2 lg:gap-x-8">
              {coda.slice(3).map((n) => (
                <NewsRiga key={n.id} item={n} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* L'ultima pagella fa da contesto SOLO mentre si vota:
          "guarda il verdetto scorso, ora tocca a te". */}
      {votazione && ultima && (
        <section className="sale sale-4 flex flex-col gap-3">
          <TitoloSezione
            titolo="L'ultima pagella"
            href={`/partite/${ultima.partita.id}`}
            link="tutta"
          />
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
