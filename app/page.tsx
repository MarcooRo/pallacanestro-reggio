import Link from "next/link";

import { NewsCard } from "@/src/components/news-card";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { VideoCard } from "@/src/components/video-card";
import { getProfilo } from "@/src/lib/identita/sessione";
import { getNews } from "@/src/lib/news/queries";
import {
  getProssimaPartita,
  getUltimaPagella,
  getVotazioneAperta,
} from "@/src/lib/partite/queries";
import { getVideoHome } from "@/src/lib/video/queries";

// La home è per tutti, dal primo tap: nessuna vetrina, nessun accesso.
// L'identità anonima nasce solo quando si partecipa (voto, reazioni…).
export default async function HomePage() {
  return <HomeContenuti />;
}

async function HomeContenuti() {
  const profilo = await getProfilo();
  const [votazione, prossima, ultima, ultimeNews, video] = await Promise.all([
    getVotazioneAperta(),
    getProssimaPartita(),
    getUltimaPagella(),
    getNews(4),
    getVideoHome(),
  ]);

  return (
    // Ogni sezione dopo la prima è separata da un divisorio e respira.
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 px-4 py-6 lg:max-w-5xl [&>section]:py-6 [&>section+section]:border-t [&>section+section]:border-border">
      {profilo?.nickname && (
        <p className="eyebrow sale">Ciao, {profilo.nickname}</p>
      )}

      {/* Il primo blocco è sempre la prossima partita di Reggio. */}
      <section className="sale sale-2 flex flex-col gap-3">
        <h2 className="display text-2xl">Prossima partita</h2>
        {prossima ? (
          // A tutta larghezza desktop il tabellone si sfilaccia: si contiene
          <div className="lg:max-w-2xl">
            <PartitaCard partita={prossima} />
          </div>
        ) : (
          <p className="taglio-sm card p-4 text-sm text-muted">
            Nessuna partita di Reggio pianificata. Guarda il{" "}
            <Link href="/calendario" className="font-bold text-brand-vivid underline">
              calendario
            </Link>{" "}
            per tutte le altre.
          </p>
        )}
      </section>

      {/* Votazione aperta: striscia compatta, non il fulcro della home.
          Il voto è una funzionalità, il focus resta seguire la squadra. */}
      {votazione && (
        <section className="sale sale-2 flex flex-col gap-3">
          <Link
            href={`/partite/${votazione.id}`}
            className="taglio display flex items-baseline justify-between bg-brand px-4 py-3.5 text-xl text-on-brand transition-colors hover:bg-brand-hover"
          >
            <span>Si vota, ora</span>
            <span className="eyebrow">vota il migliore →</span>
          </Link>
        </section>
      )}

      {/* L'ultimo video di ciascun canale (Reggio + LBA), prima delle news */}
      {video.length > 0 && (
        <section className="sale sale-3 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Video</h2>
            <Link href="/video" className="eyebrow text-brand-vivid">
              tutti →
            </Link>
          </div>
          {/* Slide orizzontale: -mx-4/px-4 per far sbordare lo scroll
              fino ai bordi dello schermo mantenendo l'allineamento.
              Su desktop non si scrolla col dito: griglia a tre. */}
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

      {ultimeNews.length > 0 && (
        <section className="sale sale-3 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">News</h2>
            <Link href="/news" className="eyebrow text-brand-vivid">
              tutte →
            </Link>
          </div>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {ultimeNews.map((n) => (
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
