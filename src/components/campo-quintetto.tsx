// Mezzo campo da basket con il quintetto base dell'ultima partita.
// I titolari arrivano già ordinati dal regista al centro: l'indice
// decide la posizione sul disegno (regia in alto, lunghi sotto canestro).

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import {
  CAMPO_ARCHI,
  CAMPO_FERRO,
  CAMPO_RETTANGOLI,
  CAMPO_TABELLONE,
  CAMPO_TRATTEGGIO,
  CAMPO_VIEWBOX,
} from "@/src/lib/campo/geometria";
import type { TitolareCampo } from "@/src/lib/partite/quintetti";

// Coordinate % sul viewBox 300×282 del campo.
const POSIZIONI = [
  { x: 50, y: 84 }, // playmaker
  { x: 17, y: 62 }, // guardia
  { x: 83, y: 62 }, // guardia/ala
  { x: 27, y: 26 }, // ala
  { x: 69, y: 21 }, // centro
] as const;

export function CampoQuintetto({
  titolari,
}: {
  titolari: readonly TitolareCampo[];
}) {
  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${CAMPO_VIEWBOX.larghezza} ${CAMPO_VIEWBOX.altezza}`}
        className="block w-full"
        aria-hidden
      >
        <rect
          width={CAMPO_VIEWBOX.larghezza}
          height={CAMPO_VIEWBOX.altezza}
          fill="var(--superficie)"
        />
        <g stroke="var(--linea)" strokeWidth="2" fill="none">
          {CAMPO_RETTANGOLI.map((r) => (
            <rect key={`${r.x}-${r.y}`} {...r} />
          ))}
          {CAMPO_ARCHI.map((a) => (
            <path
              key={a.d}
              d={a.d}
              strokeDasharray={a.tratteggiato ? CAMPO_TRATTEGGIO : undefined}
            />
          ))}
        </g>
        <g stroke="var(--muted)" strokeWidth="2" fill="none">
          <line {...CAMPO_TABELLONE} />
          <circle {...CAMPO_FERRO} />
        </g>
      </svg>

      {titolari.map((g, i) => {
        const pos = POSIZIONI[i];
        if (!pos) return null;
        return (
          <div
            key={g.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <AvatarGiocatore
              firstName={g.firstName}
              lastName={g.lastName}
              photoKey={g.photoKey}
              dimensione={48}
            />
            <span className="flex items-baseline gap-1 whitespace-nowrap bg-background/80 px-1.5 py-0.5">
              <span className="score text-[10px] text-brand-vivid">
                {g.jerseyNumber ?? ""}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-tight">
                {g.lastName}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
