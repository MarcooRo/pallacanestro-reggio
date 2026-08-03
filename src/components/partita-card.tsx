// La card partita è un tabellone in miniatura: le due squadre affacciate,
// i loghi ai bordi esterni, e nel mezzo quello che conta — il punteggio se
// si è giocato, la palla a due se si deve giocare.

import Image from "next/image";
import Link from "next/link";

import type { PartitaLista } from "@/src/lib/partite/queries";
import { dataOra, orario } from "@/src/lib/date";
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
      {/* Riga di contesto: competizione a sinistra, palla a due a destra */}
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
        <span className="eyebrow truncate">
          {partita.competitionName}
          {partita.dayName ? ` · ${partita.dayName}` : ""}
        </span>
        <span className="eyebrow shrink-0">
          {inCorso ? (
            <span className="flex items-center gap-1.5 text-brand-vivid">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-vivid" />
              Diretta
            </span>
          ) : (
            dataOra(partita.startsAt)
          )}
        </span>
      </div>

      {/* Corpo: casa | centro | ospiti, coi loghi verso l'esterno */}
      <div className="flex items-stretch gap-2 px-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <LogoSquadra logoKey={partita.homeLogoKey} nome={partita.homeTeam} />
          <span
            className={`display min-w-0 text-[17px] leading-[0.95] ${
              giocata && !vinceCasa ? "text-muted" : "text-foreground"
            }`}
          >
            {partita.homeTeam}
          </span>
        </div>

        <Centro
          punti={punti}
          casa={partita.homeScore}
          ospiti={partita.awayScore}
          vinceCasa={vinceCasa}
          vinceOspiti={vinceOspiti}
          ora={orario(partita.startsAt)}
        />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <span
            className={`display min-w-0 text-[17px] leading-[0.95] ${
              giocata && !vinceOspiti ? "text-muted" : "text-foreground"
            }`}
          >
            {partita.awayTeam}
          </span>
          <LogoSquadra logoKey={partita.awayLogoKey} nome={partita.awayTeam} />
        </div>
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

// Il centro del tabellone: i punti se ci sono, altrimenti l'ora della palla
// a due tra due fili verticali — il posto dove guarderà l'occhio comunque.
function Centro({
  punti,
  casa,
  ospiti,
  vinceCasa,
  vinceOspiti,
  ora,
}: {
  punti: boolean;
  casa: number | null;
  ospiti: number | null;
  vinceCasa: boolean;
  vinceOspiti: boolean;
  ora: string;
}) {
  if (!punti) {
    return (
      <div className="flex shrink-0 items-center gap-2 px-1">
        <span aria-hidden className="filo-verticale w-px self-stretch" />
        <span className="score text-xs text-muted">{ora}</span>
        <span aria-hidden className="filo-verticale w-px self-stretch" />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 px-1">
      <span
        className={`score text-2xl font-bold tabular-nums ${
          vinceCasa ? "led text-brand-vivid" : "text-muted"
        }`}
      >
        {casa}
      </span>
      <span aria-hidden className="text-sm text-muted">
        –
      </span>
      <span
        className={`score text-2xl font-bold tabular-nums ${
          vinceOspiti ? "led text-brand-vivid" : "text-muted"
        }`}
      >
        {ospiti}
      </span>
    </div>
  );
}
