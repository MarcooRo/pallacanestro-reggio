import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { etichettaStagione } from "@/src/lib/date";
import { getGiocatore } from "@/src/lib/giocatori/queries";
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

  // Statistiche live dalla fonte, con cache 1h: se l'API non risponde,
  // la scheda degrada senza rompersi (le stats non sono un dato critico).
  let statistiche: StatisticheStagione[] = [];
  let statsNonDisponibili = false;
  if (giocatore.lbaPlayerId) {
    try {
      statistiche = await getStatisticheGiocatore(giocatore.lbaPlayerId);
    } catch {
      statsNonDisponibili = true;
    }
  }

  const foto = fotoUrl(giocatore.photoKey, "large");
  const ultimaPermanenza = giocatore.permanenze[0];

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-4">
        {foto ? (
          <Image
            src={foto}
            alt={`${giocatore.firstName} ${giocatore.lastName}`}
            width={96}
            height={96}
            className="rounded-full bg-brand-tint object-cover"
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
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            {giocatore.firstName} {giocatore.lastName}
          </h1>
          <p className="text-sm text-muted">
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

      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-4">
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
        <h2 className="text-xl font-bold">Statistiche di stagione</h2>
        {statsNonDisponibili && (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            Statistiche momentaneamente non disponibili.
          </p>
        )}
        {!statsNonDisponibili && statistiche.length === 0 && (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
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
    <div className="rounded-lg border border-border">
      <p className="border-b border-border px-4 py-2 text-sm font-bold">
        {nomiCompetizione[s.competizione] ?? s.competizione}
      </p>
      <dl className="grid grid-cols-1 gap-x-6 px-4 py-2 sm:grid-cols-2">
        {voci.map(([nome, valore]) => (
          <div
            key={nome}
            className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-sm last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="text-muted">{nome}</dt>
            <dd className="font-semibold tabular-nums">{valore}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
