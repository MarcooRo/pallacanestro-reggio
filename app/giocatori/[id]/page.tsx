import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { etichettaStagione } from "@/src/lib/date";
import {
  getGiocatore,
  statisticheStagionaliDaDb,
} from "@/src/lib/giocatori/queries";
import { fotoUrl } from "@/src/lib/immagini";
import {
  getStatisticheGiocatore,
  type StatisticheStagione,
} from "@/src/ingestion/sources/lba";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const giocatore = await getGiocatore((await params).id);
  return giocatore
    ? { title: `${giocatore.firstName} ${giocatore.lastName}` }
    : {};
}

const nomiCompetizione: Record<string, string> = {
  RS: "Regular Season",
  PO: "Playoff",
  SI: "Supercoppa",
  CI: "Coppa Italia",
};

export default async function GiocatorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const giocatore = await getGiocatore(id);
  if (!giocatore) notFound();

  // Prima i NOSTRI dati (tabellini ingeriti, v_player_season_stats);
  // l'API live con cache 1h è solo il fallback, e se non risponde la
  // scheda degrada senza rompersi.
  let statistiche: StatisticheStagione[] = await statisticheStagionaliDaDb(
    giocatore.id,
  );
  let statsNonDisponibili = false;
  if (statistiche.length === 0 && giocatore.lbaPlayerId) {
    try {
      statistiche = await getStatisticheGiocatore(giocatore.lbaPlayerId);
    } catch {
      statsNonDisponibili = true;
    }
  }

  const foto = fotoUrl(giocatore.photoKey, "large");
  const ultimaPermanenza = giocatore.permanenze[0];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 lg:max-w-2xl">
      <TornaIndietro fallback="/giocatori" etichetta="La squadra" />

      <header className="taglio relative -mt-2 flex items-center gap-4 overflow-hidden card p-4">
        {ultimaPermanenza?.jerseyNumber && (
          <span
            aria-hidden
            className="display pointer-events-none absolute -right-3 -top-8 text-[120px] leading-none text-brand/15"
          >
            {ultimaPermanenza.jerseyNumber}
          </span>
        )}
        {foto ? (
          <Image
            src={foto}
            alt={`${giocatore.firstName} ${giocatore.lastName}`}
            width={96}
            height={96}
            className="z-10 rounded-full bg-brand-tint object-cover"
            style={{ width: 96, height: 96 }}
          />
        ) : (
          <AvatarGiocatore
            firstName={giocatore.firstName}
            lastName={giocatore.lastName}
            photoKey={null}
            dimensione={96}
          />
        )}
        <div className="z-10 flex min-w-0 flex-col gap-1">
          <h1 className="display text-3xl leading-[0.95]">
            {giocatore.firstName}
            <br />
            <span className="text-brand-vivid">{giocatore.lastName}</span>
          </h1>
          <p className="eyebrow mt-1">
            {[
              ultimaPermanenza?.jerseyNumber ? `#${ultimaPermanenza.jerseyNumber}` : null,
              ultimaPermanenza?.role,
              giocatore.nationality,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 border-l-2 border-brand pl-4 text-sm sm:grid-cols-4">
        {giocatore.heightCm && (
          <div>
            <dt className="text-xs uppercase text-muted">Altezza</dt>
            <dd className="font-semibold">{giocatore.heightCm} cm</dd>
          </div>
        )}
        {giocatore.weightKg && (
          <div>
            <dt className="text-xs uppercase text-muted">Peso</dt>
            <dd className="font-semibold">{giocatore.weightKg} kg</dd>
          </div>
        )}
        {giocatore.etaAnni !== null && (
          <div>
            <dt className="text-xs uppercase text-muted">Età</dt>
            <dd className="font-semibold">
              {giocatore.etaAnni} anni
              {giocatore.birthPlace ? ` · ${giocatore.birthPlace}` : ""}
            </dd>
          </div>
        )}
        {giocatore.permanenze.length > 0 && (
          <div>
            <dt className="text-xs uppercase text-muted">In biancorosso da</dt>
            <dd className="font-semibold">
              {etichettaStagione(
                giocatore.permanenze[giocatore.permanenze.length - 1].seasonYear,
              )}
            </dd>
          </div>
        )}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">Statistiche di stagione</h2>
        {statsNonDisponibili && (
          <p className="taglio-sm card p-4 text-sm text-muted">
            Statistiche momentaneamente non disponibili.
          </p>
        )}
        {!statsNonDisponibili && statistiche.length === 0 && (
          <p className="taglio-sm card p-4 text-sm text-muted">
            Nessuna statistica per la stagione in corso.
          </p>
        )}
        {statistiche.map((s) => (
          <TabellaStatistiche key={s.competizione} stats={s} />
        ))}
      </section>
    </main>
  );
}

function perc(fatti: number, tentati: number): string {
  return tentati > 0 ? `${Math.round((fatti / tentati) * 100)}%` : "–";
}

function TabellaStatistiche({ stats: s }: { stats: StatisticheStagione }) {
  const voci: [string, string][] = [
    ["Partite", `${s.partite}${s.quintetti ? ` (${s.quintetti} in quintetto)` : ""}`],
    ["Punti", `${s.punti} · ${s.puntiMedia.toFixed(1)} a partita`],
    ["Minuti", `${s.minutiMedia.toFixed(1)} a partita`],
    ["Valutazione", `${s.ratingMedia.toFixed(1)} media · ${s.ratingMax} max`],
    ["Tiri da 2", `${s.fg2m}/${s.fg2a} · ${perc(s.fg2m, s.fg2a)}`],
    ["Tiri da 3", `${s.fg3m}/${s.fg3a} · ${perc(s.fg3m, s.fg3a)}`],
    ["Liberi", `${s.ftm}/${s.fta} · ${perc(s.ftm, s.fta)}`],
    ["Rimbalzi", `${s.rebOff + s.rebDef} (${s.rebOff} off · ${s.rebDef} dif)`],
    ["Assist", `${s.assists} · ${s.assistMedia.toFixed(1)} a partita`],
    ["Recuperi / Perse", `${s.steals} / ${s.turnovers}`],
    ["Stoppate date / subite", `${s.blocks} / ${s.blocksReceived}`],
    ["Falli fatti / subiti", `${s.foulsCommitted} / ${s.foulsReceived}`],
    ["Massimo punti", String(s.puntiMax)],
  ];

  return (
    <div className="taglio-sm card">
      <p className="display border-b border-border px-4 py-2 text-base">
        {nomiCompetizione[s.competizione] ?? s.competizione}
      </p>
      <dl className="grid grid-cols-1 gap-x-6 px-4 py-2 sm:grid-cols-2">
        {voci.map(([nome, valore]) => (
          <div
            key={nome}
            className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-sm last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="text-muted">{nome}</dt>
            <dd className="score font-semibold">{valore}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
