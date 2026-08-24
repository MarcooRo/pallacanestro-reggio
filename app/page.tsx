import Link from "next/link";

import { NewsApertura } from "@/src/components/news-apertura";
import { NewsCard } from "@/src/components/news-card";
import { NewsRiga } from "@/src/components/news-riga";
import { NewsRiquadro } from "@/src/components/news-riquadro";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { VideoCard } from "@/src/components/video-card";
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
// il resto del campionato. Testata a due righe (apertura con accanto la
// prossima partita + tre riquadri), una fascia a tre colonne (Qui Reggio
// | redazione | video), in coda le news di lega. Le gerarchie sono
// pensate per il desktop; il telefono incolonna e avrà le sue dopo.
export default async function HomePage() {
  return <HomeContenuti />;
}

// Quante notizie entrano in ogni spazio: la testata è 1+3, la colonna di
// Reggio una lista da 5, la lega chiude a coppie.
const SOTTO_APERTURA = 3;
const COLONNA_REGGIO = 5;
const CODA_LEGA = 8;

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
  const sottoApertura = prendi(SOTTO_APERTURA);
  const colonnaReggio = prendi(COLONNA_REGGIO, (n) => fonteDiCasa(n.source));
  const codaLega = prendi(CODA_LEGA, (n) => n.source === "lba");

  return (
    // Ogni sezione dopo la prima è separata da un divisorio e respira.
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 px-4 py-6 lg:max-w-5xl [&>section]:py-6 [&>section+section]:border-t [&>section+section]:border-border">
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

      {/* ── Testata: due righe. Prima riga l'apertura alla scala che
          merita con accanto la prossima partita — il tabellone sta in
          testata come sui giornali sportivi. Seconda riga i tre riquadri
          delle notizie che incalzano. ── */}
      <section className="sale sale-2 flex flex-col gap-2.5">
        <div className="grid gap-2.5 lg:grid-cols-[2fr_1fr] lg:items-start">
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
          </div>
        </div>
        {sottoApertura.length > 0 && (
          <div className="grid gap-2.5 lg:grid-cols-3">
            {sottoApertura.map((n, i) => (
              <NewsRiquadro
                key={n.id}
                item={n}
                className="sale"
                // un gradino per riquadro, come le tessere della pagina News
                style={{ animationDelay: `${0.05 * i}s` }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Fascia a tre colonne: la cronaca di Reggio, il box della
          redazione, i video. Tre verticali affiancate da lg, incolonnate
          sul telefono. ── */}
      <section className="sale sale-3 grid gap-8 lg:grid-cols-3 lg:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Qui Reggio</h2>
            <Link href="/news?f=reggio" className="eyebrow text-brand-vivid">
              tutte →
            </Link>
          </div>
          {colonnaReggio.length > 0 ? (
            <div className="flex flex-col">
              {colonnaReggio.map((n) => (
                <NewsRiga key={n.id} item={n} />
              ))}
            </div>
          ) : (
            <p className="taglio-sm card p-4 text-sm text-muted">
              Nessun&apos;altra notizia da Reggio, per ora.
            </p>
          )}
        </div>

        {/* Il box della redazione: fondo rosso spento come la striscia
            "Solo Reggio" delle News, un pezzo alla volta — l'ultimo — che
            non scivola via con la cronaca. self-start: il rosso finisce
            dove finisce l'articolo, non si stira sulla colonna. */}
        {redazione.length > 0 && (
          <div className="taglio flex flex-col gap-3 self-start bg-brand-tint p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-2xl">Dalla redazione</h2>
              <Link
                href="/news?f=redazione"
                className="eyebrow text-brand-vivid"
              >
                tutti →
              </Link>
            </div>
            <NewsRiquadro item={redazione[0]} />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Video</h2>
            <Link href="/video" className="eyebrow text-brand-vivid">
              tutti →
            </Link>
          </div>
          {/* Sul telefono i video scorrono col dito come prima; nella
              colonna desktop stanno incolonnati */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {video.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                className="w-[82%] shrink-0 snap-start lg:w-auto"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Il resto del campionato: due colonne di card, in fondo dove
          stanno le notizie che non sono di Reggio. ── */}
      {codaLega.length > 0 && (
        <section className="sale sale-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Dal campionato</h2>
            <Link href="/news?f=seriea" className="eyebrow text-brand-vivid">
              tutte →
            </Link>
          </div>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {codaLega.map((n) => (
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
