// La pagella pubblicata: il migliore è un manifesto, il resto è tabellone.
// Legge solo aggregati (vote_tallies).

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import type { getPagella } from "@/src/lib/partite/queries";

type Righe = Awaited<ReturnType<typeof getPagella>>;

export function Pagella({ righe, compatta = false }: { righe: Righe; compatta?: boolean }) {
  if (righe.length === 0) {
    return (
      <p className="taglio-sm border border-border bg-surface p-4 text-sm text-muted">
        Nessun voto per questa partita.
      </p>
    );
  }

  const [migliore, ...resto] = righe;
  const altre = compatta ? resto.slice(0, 2) : resto;

  return (
    <div className="flex flex-col gap-2">
      {/* Il migliore in campo: manifesto rosso */}
      <div className="taglio relative flex items-center gap-4 overflow-hidden bg-brand p-4 text-on-brand">
        <span
          aria-hidden
          className="display pointer-events-none absolute -right-2 -top-5 text-[92px] leading-none text-black/15"
        >
          1
        </span>
        <AvatarGiocatore
          firstName={migliore.firstName}
          lastName={migliore.lastName}
          photoKey={migliore.photoKey}
          dimensione={compatta ? 52 : 64}
        />
        <div className="z-10 flex min-w-0 flex-1 flex-col">
          <span className="eyebrow !text-white/70">Il migliore per la curva</span>
          <span className="display truncate text-2xl">
            {migliore.firstName} {migliore.lastName}
          </span>
          {!compatta && (
            <span className="mt-0.5 text-xs text-white/80">
              {migliore.bestCount}× migliore
              {migliore.supportCount > 0 ? ` · ${migliore.supportCount} menzioni` : ""}
              {migliore.favoriteCount > 0 ? ` · ♥ ${migliore.favoriteCount}` : ""}
            </span>
          )}
        </div>
        <span className="score z-10 text-3xl font-bold">
          {migliore.performancePoints}
        </span>
      </div>

      {/* Il resto del tabellone */}
      <ol className="flex flex-col">
        {altre.map((r, i) => (
          <li
            key={r.playerId}
            className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
          >
            <span className="score w-6 text-center text-sm text-muted">{i + 2}</span>
            <AvatarGiocatore
              firstName={r.firstName}
              lastName={r.lastName}
              photoKey={r.photoKey}
              dimensione={compatta ? 30 : 36}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-tight">
              {r.firstName} {r.lastName}
            </span>
            {!compatta && (
              <span className="eyebrow">
                {r.bestCount}×B{r.supportCount > 0 ? ` ${r.supportCount}M` : ""}
                {r.favoriteCount > 0 ? ` ♥${r.favoriteCount}` : ""}
              </span>
            )}
            <span className="score text-base font-bold text-foreground">
              {r.performancePoints}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
