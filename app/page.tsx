import Link from "next/link";
import { redirect } from "next/navigation";

import { NewsCard } from "@/src/components/news-card";
import { PartitaCard } from "@/src/components/partita-card";
import { Pagella } from "@/src/components/pagella";
import { branding } from "@/src/branding";
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
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-on-brand">
          {branding.appShortName.slice(0, 1)}
        </span>
        <h1 className="text-3xl font-bold">{branding.appName}</h1>
        <p className="max-w-xs text-balance text-muted">{branding.tagline}</p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-muted">
        <li>A fine partita voti il migliore in campo</li>
        <li>I voti di tutti diventano la pagella della curva</li>
        <li>Classifiche di mese, girone e stagione</li>
      </ul>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/accesso"
          className="rounded-md bg-brand px-4 py-3 font-semibold text-on-brand hover:bg-brand-hover"
        >
          Accedi o registrati
        </Link>
        <p className="text-xs text-muted">
          Ti basta l&apos;email, niente password.
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
    getNews(4),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Ciao, {profilo!.nickname}</h1>

      {votazione && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">C&apos;è una votazione aperta</h2>
          <PartitaCard partita={votazione} />
          <Link
            href={`/partite/${votazione.id}`}
            className="rounded-md bg-brand px-4 py-3 text-center font-semibold text-on-brand hover:bg-brand-hover"
          >
            Vota il migliore
          </Link>
        </section>
      )}

      {prossima && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">Prossima partita</h2>
          <PartitaCard partita={prossima} />
        </section>
      )}

      {ultima && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">L&apos;ultima pagella</h2>
            <Link href={`/partite/${ultima.partita.id}`} className="text-sm text-brand">
              vedi tutta →
            </Link>
          </div>
          <p className="text-xs text-muted">
            {ultima.partita.homeTeam} – {ultima.partita.awayTeam}
            {ultima.partita.status === "finished"
              ? ` · ${ultima.partita.homeScore}-${ultima.partita.awayScore}`
              : ""}
          </p>
          <Pagella righe={ultima.pagella} compatta />
        </section>
      )}

      {!votazione && !prossima && !ultima && (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Nessuna votazione in corso. Intanto puoi sfogliare il{" "}
          <Link href="/calendario" className="text-brand underline">
            calendario
          </Link>
          .
        </p>
      )}

      {ultimeNews.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">News</h2>
            <Link href="/news" className="text-sm text-brand">
              tutte →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {ultimeNews.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
