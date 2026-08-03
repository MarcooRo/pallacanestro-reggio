// La pagella pubblicata: il migliore è un manifesto, il resto è tabellone.
// Legge solo aggregati (vote_tallies).

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import type { getPagella } from "@/src/lib/partite/queries";

type Righe = Awaited<ReturnType<typeof getPagella>>;

// Sempre "quante volte × che voto", scritto per esteso: "1× migliore,
// 1× preferito" si legge, "1×B ♥1" no. Vale per il primo e per tutti.
function vociVoto(r: Righe[number]): string[] {
  const voci: string[] = [];
  if (r.bestCount > 0) voci.push(`${r.bestCount}× migliore`);
  if (r.secondCount > 0) voci.push(`${r.secondCount}× secondo`);
  if (r.thirdCount > 0) voci.push(`${r.thirdCount}× terzo`);
  if (r.favoriteCount > 0) voci.push(`${r.favoriteCount}× preferito`);
  return voci;
}

export function Pagella({ righe, compatta = false }: { righe: Righe; compatta?: boolean }) {
  if (righe.length === 0) {
    return (
      <p className="taglio-sm card p-4 text-sm text-muted">
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
              {vociVoto(migliore).join(" · ")}
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
            {/* Nome sopra, il dettaglio dei voti sotto: sulla riga stava
                solo in sigle, e le sigle non si capivano */}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-bold uppercase tracking-tight">
                {r.firstName} {r.lastName}
              </span>
              {!compatta && (
                <span className="mt-0.5 text-[11px] text-muted">
                  {vociVoto(r).join(" · ")}
                </span>
              )}
            </span>
            <span className="score text-base font-bold text-foreground">
              {r.performancePoints}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
