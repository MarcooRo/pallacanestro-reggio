import Link from "next/link";

import type { PartitaLista } from "@/src/lib/partite/queries";
import { dataOra } from "@/src/lib/date";

export function PartitaCard({ partita }: { partita: PartitaLista }) {
  const giocata = partita.status === "finished";

  return (
    <Link
      href={`/partite/${partita.id}`}
      className="taglio-sm group flex flex-col gap-3 border border-border bg-surface p-4 transition-colors hover:border-brand"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">
          {partita.competitionName}
          {partita.dayName ? ` · ${partita.dayName}` : ""}
        </span>
        <span className="eyebrow">{dataOra(partita.startsAt)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {[
          { squadra: partita.homeTeam, punti: partita.homeScore },
          { squadra: partita.awayTeam, punti: partita.awayScore },
        ].map(({ squadra, punti }, i) => {
          const vince =
            giocata &&
            partita.homeScore !== null &&
            partita.awayScore !== null &&
            (i === 0
              ? partita.homeScore > partita.awayScore
              : partita.awayScore > partita.homeScore);
          return (
            <div key={squadra} className="flex items-center justify-between gap-3">
              <span
                className={`truncate text-[15px] font-bold uppercase tracking-tight ${
                  giocata && !vince ? "text-muted" : "text-foreground"
                }`}
              >
                {squadra}
              </span>
              {giocata && (
                <span
                  className={`score text-lg font-bold ${
                    vince ? "text-brand-vivid" : "text-muted"
                  }`}
                >
                  {punti}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {partita.votingState !== "closed" && (
        <span
          className={`-skew-x-[14deg] self-start px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
            partita.votingState === "open"
              ? "bg-brand text-on-brand"
              : "bg-brand-tint text-brand-vivid"
          }`}
        >
          <span className="inline-block skew-x-[14deg]">
            {partita.votingState === "open" ? "Voto aperto" : "Pagella"}
          </span>
        </span>
      )}
    </Link>
  );
}
