// Campo intero con le due squadre schierate: ospiti in alto, casa in basso
// (specchiati), come una distinta. Il mezzo campo è lo stesso disegno della
// pagina squadra (campo-quintetto.tsx), ribaltato per la metà di sotto.

import Image from "next/image";
import Link from "next/link";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { fotoUrl } from "@/src/lib/immagini";
import type { Formazione } from "@/src/lib/partite/quintetti";

export interface LatoCampo extends Formazione {
  nome: string;
  logoKey: string | null;
  /** Scheda squadra: /giocatori per Reggio, /squadre/[id] per le altre */
  scheda: string;
}

// Coordinate % sul MEZZO campo (viewBox 300×282), come nella pagina
// squadra: regia verso il centro, lunghi sotto canestro.
const POSIZIONI = [
  { x: 50, y: 84 }, // playmaker
  { x: 17, y: 62 }, // guardia
  { x: 83, y: 62 }, // guardia/ala
  { x: 27, y: 26 }, // ala
  { x: 69, y: 21 }, // centro
] as const;

// Sul campo intero la metà di sopra dimezza la y; quella di sotto la
// ribalta (e specchia la x, così le due squadre non sono un copia-incolla).
function collocazione(indice: number, lato: "casa" | "ospiti") {
  const p = POSIZIONI[indice];
  if (!p) return null;
  return lato === "ospiti"
    ? { left: `${p.x}%`, top: `${p.y / 2}%` }
    : { left: `${100 - p.x}%`, top: `${100 - p.y / 2}%` };
}

export function CampoPartita({
  casa,
  ospiti,
}: {
  casa: LatoCampo;
  ospiti: LatoCampo;
}) {
  return (
    <div className="taglio flex flex-col gap-2 card p-3">
      <Testata lato={ospiti} />

      <div className="relative w-full">
        <svg viewBox="0 0 300 564" className="block w-full" aria-hidden>
          <rect width="300" height="564" fill="var(--superficie)" />
          <g stroke="var(--linea)" strokeWidth="2" fill="none">
            <rect x="1" y="1" width="298" height="562" />
            <line x1="1" y1="282" x2="299" y2="282" />
            <circle cx="150" cy="282" r="36" />
          </g>
          <MetaCampo />
          <g transform="translate(0,564) scale(1,-1)">
            <MetaCampo />
          </g>
        </svg>

        {[
          { lato: "ospiti" as const, formazione: ospiti },
          { lato: "casa" as const, formazione: casa },
        ].map(({ lato, formazione }) =>
          formazione.titolari.map((g, i) => {
            const dove = collocazione(i, lato);
            if (!dove) return null;
            return (
              <div
                key={`${lato}-${g.id}`}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={dove}
              >
                <AvatarGiocatore
                  firstName={g.firstName}
                  lastName={g.lastName}
                  photoKey={g.photoKey}
                  dimensione={44}
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
          }),
        )}
      </div>

      <Testata lato={casa} />
    </div>
  );
}

function Testata({ lato }: { lato: LatoCampo }) {
  const logo = fotoUrl(lato.logoKey, "thumb");
  return (
    <div className="flex items-center gap-2">
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 shrink-0 object-contain"
        />
      ) : (
        <span aria-hidden className="h-5 w-5 shrink-0" />
      )}
      <Link
        href={lato.scheda}
        className="display min-w-0 flex-1 truncate text-sm transition-colors hover:text-brand-vivid"
      >
        {lato.nome}
      </Link>
      <span className="eyebrow shrink-0 text-[10px]">{lato.fonte}</span>
    </div>
  );
}

// Mezza area: canestro in alto, arco dei tre punti verso il centro.
// Cerchio e linea di metà campo li disegna il chiamante, una volta sola.
function MetaCampo() {
  return (
    <>
      <g stroke="var(--linea)" strokeWidth="2" fill="none">
        <rect x="105" y="1" width="90" height="87" />
        <path d="M120 88a30 30 0 0 0 60 0" />
        <path d="M120 88a30 30 0 0 1 60 0" strokeDasharray="6 6" />
        <path d="M27 1v22a123 123 0 0 0 246 0V1" />
      </g>
      <g stroke="var(--muted)" strokeWidth="2" fill="none">
        <line x1="132" y1="12" x2="168" y2="12" />
        <circle cx="150" cy="21" r="6.5" />
      </g>
    </>
  );
}
