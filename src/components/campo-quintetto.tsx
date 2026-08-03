// Mezzo campo da basket con il quintetto base dell'ultima partita.
// I titolari arrivano già ordinati dal regista al centro: l'indice
// decide la posizione sul disegno (regia in alto, lunghi sotto canestro).

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
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
      <svg viewBox="0 0 300 282" className="block w-full" aria-hidden>
        <rect width="300" height="282" fill="var(--superficie)" />
        <g stroke="var(--linea)" strokeWidth="2" fill="none">
          <rect x="1" y="1" width="298" height="280" />
          <rect x="105" y="1" width="90" height="87" />
          <path d="M120 88a30 30 0 0 0 60 0" />
          <path d="M120 88a30 30 0 0 1 60 0" strokeDasharray="6 6" />
          <path d="M27 1v22a123 123 0 0 0 246 0V1" />
          <path d="M114 281a36 36 0 0 1 72 0" />
        </g>
        <g stroke="var(--muted)" strokeWidth="2" fill="none">
          <line x1="132" y1="12" x2="168" y2="12" />
          <circle cx="150" cy="21" r="6.5" />
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
