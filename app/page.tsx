import Link from "next/link";
import { redirect } from "next/navigation";

import { NewsCard } from "@/src/components/news-card";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { getNews } from "@/src/lib/news/queries";
import {
  getProssimaPartita,
  getUltimaPagella,
  getVotazioneAperta,
} from "@/src/lib/partite/queries";

export default async function HomePage() {
  const utente = await getUtente();

  // Loggato ma senza nickname: il profilo va completato prima di entrare.
  if (utente && !(await getProfilo())) redirect("/benvenuto");

  if (utente) return <HomeLoggata />;

  // Splash per chi non è loggato. Solo la home fa da vetrina: le pagine
  // pubbliche (pagelle, classifiche) restano apribili dal link condiviso,
  // come da principio "zero attrito" della spec.
  return (
    <main className="flex flex-1 flex-col justify-center gap-10 px-5 py-12">
      <h1 className="display flex flex-col text-[17vw] leading-[0.92] sm:text-6xl">
        <span className="sale">Il migliore</span>
        <span className="sale sale-2">lo decide</span>
        <span className="sale sale-3 text-brand-vivid">la curva.</span>
      </h1>

      <ul className="sale sale-3 flex flex-col gap-2.5 border-l-2 border-brand pl-4 text-sm text-muted">
        <li>A fine partita voti il migliore in campo</li>
        <li>I voti di tutti diventano la pagella della curva</li>
        <li>Classifiche di mese, girone e stagione</li>
      </ul>

      <div className="sale sale-4 flex flex-col gap-3">
        <Link
          href="/accesso"
          className="taglio display bg-brand px-6 py-4 text-center text-2xl text-on-brand transition-colors hover:bg-brand-hover"
        >
          Entra e vota
        </Link>
        <p className="eyebrow text-center">
          solo email · niente password · voti anonimi
        </p>
      </div>
    </main>
  );
}

async function HomeLoggata() {
  const profilo = await getProfilo();
  const [votazione, prossima, ultima, ultimeNews] = await Promise.all([
    getVotazioneAperta(),
    getProssimaPartita(),
    getUltimaPagella(),
    // in home solo le news di Reggio; la Serie A vive in /news
    getNews(4, "pr_wordpress"),
  ]);

  return (
    // Ogni sezione dopo la prima è separata da un divisorio e respira.
    <main className="flex flex-1 flex-col gap-2 px-4 py-6 [&>section]:py-6 [&>section+section]:border-t [&>section+section]:border-border">
      <p className="eyebrow sale">Ciao, {profilo!.nickname}</p>

      {votazione && (
        <section className="sale sale-2 flex flex-col gap-3">
          <h2 className="display text-2xl text-brand-vivid">Si vota, ora</h2>
          <PartitaCard partita={votazione} />
          <Link
            href={`/partite/${votazione.id}`}
            className="taglio display bg-brand px-4 py-3.5 text-center text-xl text-on-brand transition-colors hover:bg-brand-hover"
          >
            Vota il migliore
          </Link>
        </section>
      )}

      {/* L'ultima pagella fa da contesto SOLO mentre si vota:
          "guarda il verdetto scorso, ora tocca a te". */}
      {votazione && ultima && (
        <section className="sale sale-3 flex flex-col gap-3">
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

      {prossima && (
        <section className="sale sale-2 flex flex-col gap-3">
          <h2 className="display text-2xl">Prossima partita</h2>
          <PartitaCard partita={prossima} />
        </section>
      )}

      {!votazione && !prossima && (
        <p className="taglio-sm border border-border bg-surface p-4 text-sm text-muted">
          Nessuna votazione in corso. Intanto puoi sfogliare il{" "}
          <Link href="/calendario" className="text-brand-vivid underline">
            calendario
          </Link>
          .
        </p>
      )}

      {ultimeNews.length > 0 && (
        <section className="sale sale-4 flex flex-col gap-3">
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
    </main>
  );
}
