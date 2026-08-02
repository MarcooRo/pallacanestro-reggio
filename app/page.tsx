import Link from "next/link";
import { redirect } from "next/navigation";

import { MarchioR } from "@/src/components/marchio-r";
import { NewsCard } from "@/src/components/news-card";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { VideoCard } from "@/src/components/video-card";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { getNews } from "@/src/lib/news/queries";
import {
  getProssimaPartita,
  getUltimaPagella,
  getVotazioneAperta,
} from "@/src/lib/partite/queries";
import { getVideoHome } from "@/src/lib/video/queries";

export default async function HomePage() {
  const utente = await getUtente();

  // Loggato ma senza nickname: il profilo va completato prima di entrare.
  if (utente && !(await getProfilo())) redirect("/benvenuto");

  if (utente) return <HomeLoggata />;

  // Splash per chi non è loggato. Solo la home fa da vetrina: le pagine
  // pubbliche (pagelle, classifiche) restano apribili dal link condiviso,
  // come da principio "zero attrito" della spec.
  return (
    <main className="relative flex flex-1 flex-col justify-center gap-10 overflow-hidden px-5 py-12">
      {/* Richiamo al logo: la R in negativo, watermark dietro il titolo */}
      <MarchioR className="pointer-events-none absolute -right-8 top-10 h-52 w-auto text-foreground opacity-[0.05]" />
      <h1 className="display flex flex-col text-[17vw] leading-[0.92] sm:text-6xl">
        <span className="sale">Tutta Reggio,</span>
        <span className="sale sale-2">ogni news,</span>
        <span className="sale sale-3 text-brand-vivid">ogni partita.</span>
      </h1>

      {/* Due livelli di lettura: la promessa, poi il dettaglio nudo */}
      <div className="sale sale-3 flex flex-col gap-4">
        <p className="border-l-2 border-brand pl-4 text-base font-bold">
          Vota i tuoi preferiti in campo
        </p>
        <p className="text-sm leading-relaxed text-muted">
          News e comunicati della squadra, calendario, statistiche, risultati
          e classifiche sempre aggiornati in tempo reale.
        </p>
      </div>

      <div className="sale sale-4 flex flex-col gap-3">
        <Link
          href="/accesso"
          className="taglio display bg-brand px-6 py-4 text-center text-2xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Entra
        </Link>
        <p className="eyebrow text-center">
          registrazione in 10 secondi · è gratis
        </p>
      </div>
    </main>
  );
}

async function HomeLoggata() {
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
    <main className="flex flex-1 flex-col gap-2 px-4 py-6 [&>section]:py-6 [&>section+section]:border-t [&>section+section]:border-border">
      <p className="eyebrow sale">Ciao, {profilo!.nickname}</p>

      {/* Il primo blocco è sempre la prossima partita di Reggio. */}
      <section className="sale sale-2 flex flex-col gap-3">
        <h2 className="display text-2xl">Prossima partita</h2>
        {prossima ? (
          <PartitaCard partita={prossima} />
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
              fino ai bordi dello schermo mantenendo l'allineamento */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {video.map((v) => (
              <VideoCard
                key={v.videoId}
                video={v}
                className="w-[82%] shrink-0 snap-start"
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
          <div className="flex flex-col gap-2.5">
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
