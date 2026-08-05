// La card partita è il pannello del segnapunti: le due squadre incolonnate
// una per riga, il logo a sinistra, il punteggio in fondo a destra.
//
// L'affaccio orizzontale (casa | punti | ospiti) era bello sul desktop e
// inservibile sul telefono: a 390px ogni nome aveva 85px e "Milano" andava a
// capo come "MILAN / O". Incolonnate, le squadre hanno tutta la larghezza
// della card e il nome per esteso ci sta su una riga.

import Image from "next/image";
import Link from "next/link";

import type { PartitaLista } from "@/src/lib/partite/queries";
import { dataBreve } from "@/src/lib/date";
import { contestoPartita } from "@/src/lib/partite/etichette";
import { fotoUrl } from "@/src/lib/immagini";

function LogoSquadra({ logoKey, nome }: { logoKey: string | null; nome: string }) {
  const url = fotoUrl(logoKey, "thumb");
  if (!url) return <span aria-hidden className="h-9 w-9 shrink-0" />;
  return (
    <Image
      src={url}
      alt={`Logo ${nome}`}
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 object-contain"
    />
  );
}

// Una riga del tabellone. Il filo rosso a sinistra segna Reggio: in una
// lista di "tutte" le partite dice a colpo d'occhio dov'è la nostra.
function RigaSquadra({
  nome,
  logoKey,
  punti,
  mostraPunti,
  vince,
  spenta,
  reggio,
}: {
  nome: string;
  logoKey: string | null;
  punti: number | null;
  mostraPunti: boolean;
  vince: boolean;
  spenta: boolean;
  reggio: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 border-l-2 px-3 py-2.5 ${
        reggio ? "border-brand" : "border-transparent"
      }`}
    >
      <LogoSquadra logoKey={logoKey} nome={nome} />
      <span
        className={`display min-w-0 flex-1 break-words text-[15px] leading-[1.1] sm:text-[17px] ${
          spenta ? "text-muted" : "text-foreground"
        }`}
      >
        {nome}
      </span>
      {mostraPunti && (
        <span
          className={`score min-w-[2.25rem] shrink-0 text-right text-2xl font-bold tabular-nums ${
            vince ? "led text-brand-vivid" : "text-muted"
          }`}
        >
          {punti}
        </span>
      )}
    </div>
  );
}

export function PartitaCard({ partita }: { partita: PartitaLista }) {
  const giocata = partita.status === "finished";
  const inCorso = partita.status === "live";
  const punti =
    (giocata || inCorso) &&
    partita.homeScore !== null &&
    partita.awayScore !== null;
  const vinceCasa = punti && partita.homeScore! > partita.awayScore!;
  const vinceOspiti = punti && partita.awayScore! > partita.homeScore!;

  return (
    <Link
      href={`/partite/${partita.id}`}
      className="tabellone taglio-sm group flex flex-col transition-colors hover:border-brand"
    >
      {/* Riga di contesto: dove siamo a sinistra, palla a due a destra.
          Prima la giornata e poi la competizione: se lo spazio finisce si
          taglia la parte che si sapeva già, non "Quarti di finale". */}
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
        <span className="eyebrow truncate">{contestoPartita(partita)}</span>
        <span className="eyebrow shrink-0">
          {inCorso ? (
            <span className="flex items-center gap-1.5 text-brand-vivid">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-vivid" />
              Diretta
            </span>
          ) : (
            dataBreve(partita.startsAt)
          )}
        </span>
      </div>

      <div className="flex flex-col py-0.5">
        <RigaSquadra
          nome={partita.homeTeam}
          logoKey={partita.homeLogoKey}
          punti={partita.homeScore}
          mostraPunti={punti}
          vince={vinceCasa}
          spenta={giocata && !vinceCasa}
          reggio={partita.homeIsReggio}
        />
        <RigaSquadra
          nome={partita.awayTeam}
          logoKey={partita.awayLogoKey}
          punti={partita.awayScore}
          mostraPunti={punti}
          vince={vinceOspiti}
          spenta={giocata && !vinceOspiti}
          reggio={partita.awayIsReggio}
        />
      </div>

      {partita.votingState !== "closed" && (
        <div className="border-t border-border px-3 py-2">
          <span
            className={`-skew-x-[14deg] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
              partita.votingState === "open"
                ? "bg-brand text-on-brand"
                : "bg-brand-tint text-brand-vivid"
            }`}
          >
            <span className="inline-block skew-x-[14deg]">
              {partita.votingState === "open" ? "Voto aperto" : "Pagella"}
            </span>
          </span>
        </div>
      )}
    </Link>
  );
}
