// La pagella pubblicata: classifica di partita con punti performance
// e conteggio preferito. Legge solo aggregati (vote_tallies).

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import type { getPagella } from "@/src/lib/partite/queries";

type Righe = Awaited<ReturnType<typeof getPagella>>;

export function Pagella({ righe, compatta = false }: { righe: Righe; compatta?: boolean }) {
  if (righe.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Nessun voto per questa partita.
      </p>
    );
  }

  const daMostrare = compatta ? righe.slice(0, 3) : righe;

  return (
    <ol className="flex flex-col gap-2">
      {daMostrare.map((r, i) => (
        <li
          key={r.playerId}
          className={`flex items-center gap-3 rounded-lg border p-3 ${
            i === 0 ? "border-brand bg-brand-tint" : "border-border"
          }`}
        >
          <span className="w-5 text-center text-sm font-bold text-muted">{i + 1}</span>
          <AvatarGiocatore
            firstName={r.firstName}
            lastName={r.lastName}
            photoKey={r.photoKey}
            dimensione={compatta ? 32 : 40}
          />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {r.firstName} {r.lastName}
          </span>
          {!compatta && (
            <span className="text-xs text-muted">
              {r.bestCount}× migliore
              {r.supportCount > 0 ? ` · ${r.supportCount} menzioni` : ""}
              {r.favoriteCount > 0 ? ` · ♥ ${r.favoriteCount}` : ""}
            </span>
          )}
          <span className="text-lg font-bold tabular-nums text-brand">
            {r.performancePoints}
          </span>
        </li>
      ))}
    </ol>
  );
}
