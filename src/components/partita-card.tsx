import Link from "next/link";

import type { PartitaLista } from "@/src/lib/partite/queries";
import { dataOra } from "@/src/lib/date";

export function PartitaCard({ partita }: { partita: PartitaLista }) {
  const giocata = partita.status === "finished";

  return (
    <Link
      href={`/partite/${partita.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border p-4 hover:border-brand"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {partita.competitionName}
          {partita.dayName ? ` · ${partita.dayName}` : ""}
        </span>
        <span>{dataOra(partita.startsAt)}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1 text-sm font-semibold">
          <span className="truncate">{partita.homeTeam}</span>
          <span className="truncate">{partita.awayTeam}</span>
        </div>
        {giocata && (
          <div className="flex flex-col gap-1 text-right text-sm font-bold tabular-nums">
            <span>{partita.homeScore}</span>
            <span>{partita.awayScore}</span>
          </div>
        )}
      </div>

      {partita.votingState !== "closed" && (
        <span
          className={`self-start rounded-full px-2 py-0.5 text-xs font-semibold ${
            partita.votingState === "open"
              ? "bg-brand text-on-brand"
              : "bg-brand-tint text-brand"
          }`}
        >
          {partita.votingState === "open" ? "Voto aperto" : "Pagella pubblicata"}
        </span>
      )}
    </Link>
  );
}
