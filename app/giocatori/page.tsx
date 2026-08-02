import type { Metadata } from "next";
import Link from "next/link";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { CampoQuintetto } from "@/src/components/campo-quintetto";
import { Pillola } from "@/src/components/pillola";
import { etichettaStagione } from "@/src/lib/date";
import {
  getLeaderStagione,
  getQuintettoUltima,
  getRosterStagione,
  getStagioniRoster,
  type LeaderStagione,
} from "@/src/lib/giocatori/queries";

export const metadata: Metadata = { title: "Giocatori" };

export default async function GiocatoriPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const stagioni = await getStagioniRoster();
  if (stagioni.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="display text-3xl">La squadra</h1>
        <p className="taglio-sm card p-4 text-sm text-muted">
          Il roster non è ancora disponibile: la fonte non l&apos;ha pubblicato.
        </p>
      </main>
    );
  }

  const { s } = await searchParams;
  const richiesta = Number(s);
  const stagione = stagioni.includes(richiesta) ? richiesta : stagioni[0];

  const [roster, quintetto, leader] = await Promise.all([
    getRosterStagione(stagione).then((r) =>
      r.sort((a, b) => Number(a.jerseyNumber ?? 999) - Number(b.jerseyNumber ?? 999)),
    ),
    getQuintettoUltima(),
    getLeaderStagione(stagione),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">La squadra</h1>

      <div className="flex gap-2.5 pl-1">
        {stagioni.map((anno) => (
          <Pillola key={anno} href={`/giocatori?s=${anno}`} attiva={anno === stagione}>
            {etichettaStagione(anno)}
          </Pillola>
        ))}
      </div>

      {/* Il campo ha senso solo per la stagione dell'ultima partita */}
      {quintetto && quintetto.partita.seasonYear === stagione && (
        <section className="flex flex-col gap-2">
          <h2 className="display text-2xl">L&apos;ultimo quintetto</h2>
          <p className="eyebrow">
            {quintetto.partita.homeTeam} – {quintetto.partita.awayTeam}
            {quintetto.partita.homeScore !== null
              ? ` · ${quintetto.partita.homeScore}-${quintetto.partita.awayScore}`
              : ""}
          </p>
          <div className="taglio-sm border border-border-strong">
            <CampoQuintetto titolari={quintetto.titolari} />
          </div>
        </section>
      )}

      {leader && (
        <section className="flex flex-col gap-2">
          <h2 className="display text-2xl">Leader stagionali</h2>
          <div className="grid grid-cols-3 gap-2.5">
            <TesseraLeader etichetta="Punti" leader={leader.punti} valore={media(leader.punti.punti)} />
            <TesseraLeader etichetta="Rimbalzi" leader={leader.rimbalzi} valore={media(leader.rimbalzi.rimbalzi)} />
            <TesseraLeader etichetta="Assist" leader={leader.assist} valore={media(leader.assist.assist)} />
            <TesseraLeader etichetta="Stoppate" leader={leader.stoppate} valore={media(leader.stoppate.stoppate)} />
            {leader.tiri2 && (
              <TesseraLeader
                etichetta="Tiri da 2"
                leader={leader.tiri2}
                valore={percentuale(leader.tiri2.t2m, leader.tiri2.t2a)}
              />
            )}
            {leader.tiri3 && (
              <TesseraLeader
                etichetta="Tiri da 3"
                leader={leader.tiri3}
                valore={percentuale(leader.tiri3.t3m, leader.tiri3.t3a)}
              />
            )}
          </div>
        </section>
      )}

      <h2 className="display mt-2 text-2xl">Roster</h2>
      <ul className="flex flex-col">
        {roster.map((g) => (
          <li key={`${g.id}-${g.startDate}`}>
            <Link
              href={`/giocatori/${g.id}`}
              className="group flex items-center gap-3 border-b border-border py-3 transition-colors hover:bg-surface"
            >
              <span className="display w-10 text-center text-2xl text-brand transition-colors group-hover:text-brand-vivid">
                {g.jerseyNumber ?? "–"}
              </span>
              <AvatarGiocatore
                firstName={g.firstName}
                lastName={g.lastName}
                photoKey={g.photoKey}
                dimensione={44}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-bold uppercase tracking-tight">
                  {g.firstName} {g.lastName}
                </span>
                <span className="eyebrow mt-0.5">
                  {[g.role, g.nationality].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span aria-hidden className="pr-2 text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand-vivid">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function media(n: number): string {
  return n.toLocaleString("it-IT", { minimumFractionDigits: 1 });
}

function percentuale(fatti: number, tentati: number): string {
  return `${Math.round((fatti / tentati) * 100)}%`;
}

// Tessera compatta: il numero a grandi cifre, il giocatore sotto.
function TesseraLeader({
  etichetta,
  leader,
  valore,
}: {
  etichetta: string;
  leader: LeaderStagione;
  valore: string;
}) {
  return (
    <div className="taglio-sm flex flex-col items-center gap-1.5 card px-2 py-3 text-center">
      <span className="eyebrow">{etichetta}</span>
      <span className="score text-2xl font-bold text-brand-vivid">{valore}</span>
      <AvatarGiocatore
        firstName={leader.firstName}
        lastName={leader.lastName}
        photoKey={leader.photoKey}
        dimensione={36}
      />
      <span className="w-full truncate text-[11px] font-bold uppercase tracking-tight">
        {leader.lastName}
      </span>
    </div>
  );
}
