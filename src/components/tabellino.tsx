// Il tabellino della partita: una tabella per squadra, colonne compatte,
// scroll orizzontale dentro il proprio contenitore.

import Link from "next/link";

import type { RigaTabellino } from "@/src/lib/partite/queries";

const COLONNE = [
  "MIN",
  "PTS",
  "2P",
  "3P",
  "TL",
  "RO",
  "RD",
  "AS",
  "PR",
  "PP",
  "F",
  "VAL",
  "+/-",
] as const;

function TabellaSquadra({
  nome,
  righe,
}: {
  nome: string;
  righe: RigaTabellino[];
}) {
  if (righe.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold">{nome}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border bg-surface text-xs text-muted">
              <th className="px-3 py-2 text-left font-semibold">Giocatore</th>
              {COLONNE.map((c) => (
                <th key={c} className="px-2 py-2 text-right font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.player_id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-1.5">
                  <Link href={`/giocatori/${r.player_id}`} className="hover:text-brand">
                    {r.starter ? <strong>{r.last_name}</strong> : r.last_name}{" "}
                    <span className="text-muted">{r.first_name?.[0]}.</span>
                  </Link>
                </td>
                <td className="px-2 py-1.5 text-right">{r.minutes?.toFixed(0) ?? "–"}</td>
                <td className="px-2 py-1.5 text-right font-semibold">{r.points ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.fg2m}/{r.fg2a}</td>
                <td className="px-2 py-1.5 text-right">{r.fg3m}/{r.fg3a}</td>
                <td className="px-2 py-1.5 text-right">{r.ftm}/{r.fta}</td>
                <td className="px-2 py-1.5 text-right">{r.reb_off ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.reb_def ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.assists ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.steals ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.turnovers ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.fouls_committed ?? 0}</td>
                <td className="px-2 py-1.5 text-right font-semibold">{r.rating ?? 0}</td>
                <td className="px-2 py-1.5 text-right">{r.plus_minus ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Tabellino({
  righe,
  nomeCasa,
  nomeOspiti,
}: {
  righe: RigaTabellino[];
  nomeCasa: string;
  nomeOspiti: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Tabellino</h2>
      <p className="text-xs text-muted">
        In grassetto il quintetto base. MIN minuti · 2P/3P/TL tiri · RO/RD
        rimbalzi off/dif · AS assist · PR recuperi · PP perse · F falli ·
        VAL valutazione
      </p>
      <TabellaSquadra nome={nomeCasa} righe={righe.filter((r) => r.lato === "home")} />
      <TabellaSquadra nome={nomeOspiti} righe={righe.filter((r) => r.lato === "away")} />
    </section>
  );
}
