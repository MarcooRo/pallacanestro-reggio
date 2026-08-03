"use client";

// La scheda voto: un podio da riempire a tocchi, non quattro tendine.
//
// Un solo schermo: in alto il podio vuoto (2° 1° 3°, come quello vero) più
// la casella del preferito, sotto tutte le facce. Tocchi una faccia e va nel
// primo gradino libero; la ritocchi e la togli. Solo il migliore è
// obbligatorio: gli altri gradini si saltano.
//
// Le regole vere restano nella server action: qui c'è solo l'esperienza.

import { useActionState, useState } from "react";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { esprimiVoto, type StatoVoto } from "@/src/lib/voto/actions";
import type { Votabile } from "@/src/lib/partite/queries";

type Gradino = "best" | "secondo" | "terzo" | "preferito";

// L'ordine in cui si chiede. Il preferito è l'ultimo: è un'altra domanda.
const ORDINE: Gradino[] = ["best", "secondo", "terzo", "preferito"];

const ETICHETTE: Record<Gradino, { breve: string; lunga: string }> = {
  best: { breve: "1°", lunga: "il migliore in campo" },
  secondo: { breve: "2°", lunga: "il secondo" },
  terzo: { breve: "3°", lunga: "il terzo" },
  preferito: { breve: "♥", lunga: "il tuo preferito" },
};

// Il campo del form per ciascun gradino: il contratto della server action
// non cambia (optional_a = secondo, optional_b = terzo).
const CAMPI: Record<Gradino, string> = {
  best: "bestPlayerId",
  secondo: "optionalAId",
  terzo: "optionalBId",
  preferito: "favoritePlayerId",
};

// Altezze del podio: il primo gradino è il più alto, come dal vero. Il più
// basso deve comunque contenere etichetta + faccia + cognome.
const ALTEZZA: Record<Gradino, string> = {
  best: "h-[116px]",
  secondo: "h-[104px]",
  terzo: "h-[94px]",
  preferito: "h-[104px]",
};

type Scelte = Partial<Record<Gradino, Votabile>>;

export function FormVoto({
  matchId,
  votabili,
}: {
  matchId: string;
  votabili: Votabile[];
}) {
  const [stato, azione, inCorso] = useActionState<StatoVoto, FormData>(
    esprimiVoto,
    {},
  );
  const [scelte, setScelte] = useState<Scelte>({});
  const [saltati, setSaltati] = useState<Gradino[]>([]);

  // Il gradino di cui si sta parlando: il primo libero e non saltato.
  const passo =
    ORDINE.find((g) => !scelte[g] && !saltati.includes(g)) ?? null;

  const gradinoDi = (playerId: string): Gradino | undefined =>
    ORDINE.find((g) => g !== "preferito" && scelte[g]?.player_id === playerId);

  function tocca(v: Votabile) {
    navigator.vibrate?.(10);
    const giaSul = gradinoDi(v.player_id);
    const eraPreferito = scelte.preferito?.player_id === v.player_id;

    // Sul podio ci si sta una volta sola: ritoccare un giocatore già
    // scelto lo tira giù dal suo gradino — anche a podio completo, che è
    // il modo per cambiare idea senza ricominciare.
    if (giaSul && passo !== "preferito") return svuota(giaSul);
    // Il preferito può coincidere col podio: è affetto, non prestazione.
    if (eraPreferito && (passo === "preferito" || !passo)) {
      return svuota("preferito");
    }
    if (!passo) return;

    setScelte((s) => ({ ...s, [passo]: v }));
  }

  function svuota(g: Gradino) {
    setScelte((s) => ({ ...s, [g]: undefined }));
    setSaltati((s) => s.filter((x) => x !== g));
  }

  if (stato.ok) {
    return (
      <div className="taglio border border-brand bg-brand-tint p-4">
        <p className="display text-lg text-brand-vivid">Voto registrato</p>
        <p className="mt-1 text-sm text-muted">
          La pagella si vedrà alla chiusura della votazione.
        </p>
      </div>
    );
  }

  return (
    <form action={azione} className="tabellone taglio flex flex-col gap-4 p-4">
      <input type="hidden" name="matchId" value={matchId} />
      {ORDINE.map((g) => (
        <input
          key={g}
          type="hidden"
          name={CAMPI[g]}
          value={scelte[g]?.player_id ?? ""}
        />
      ))}

      {stato.errore && (
        <p className="border-l-2 border-brand-vivid bg-brand-tint px-3 py-2 text-sm text-brand-vivid">
          {stato.errore}
        </p>
      )}

      {/* Il podio: 2° 1° 3°, e a parte la casella del preferito */}
      <div className="flex items-end gap-2">
        {(["secondo", "best", "terzo"] as Gradino[]).map((g) => (
          <Casella
            key={g}
            gradino={g}
            scelto={scelte[g]}
            attivo={passo === g}
            saltato={saltati.includes(g)}
            onSvuota={() => svuota(g)}
          />
        ))}
        <span aria-hidden className="filo-verticale mx-1 w-px self-stretch" />
        <Casella
          gradino="preferito"
          scelto={scelte.preferito}
          attivo={passo === "preferito"}
          saltato={saltati.includes("preferito")}
          onSvuota={() => svuota("preferito")}
        />
      </div>

      {/* Riga di stato: cosa si sta scegliendo, e come saltarlo */}
      <div className="flex min-h-8 items-center justify-between gap-3">
        {passo ? (
          <>
            <p className="text-sm">
              <span className="eyebrow">ora scegli</span>{" "}
              <span className="font-bold">{ETICHETTE[passo].lunga}</span>
            </p>
            {passo !== "best" && (
              <button
                type="button"
                onClick={() => setSaltati((s) => [...s, passo])}
                className="eyebrow shrink-0 cursor-pointer underline decoration-dotted transition-colors hover:text-foreground"
              >
                salta
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-brand-vivid">
            Podio fatto. Tocca una casella per cambiarla.
          </p>
        )}
      </div>

      {/* Le facce: tutte insieme, con il gradino addosso a chi è scelto */}
      <div className="grid grid-cols-4 gap-x-1 gap-y-3">
        {votabili.map((v) => {
          const gradino = gradinoDi(v.player_id);
          const preferito = scelte.preferito?.player_id === v.player_id;
          return (
            <button
              key={v.player_id}
              type="button"
              onClick={() => tocca(v)}
              aria-pressed={Boolean(gradino || preferito)}
              aria-label={`${v.first_name} ${v.last_name}${
                gradino ? `, ${ETICHETTE[gradino].lunga}` : ""
              }${preferito ? ", il tuo preferito" : ""}`}
              className="group flex cursor-pointer flex-col items-center gap-1"
            >
              <span className="relative">
                <span
                  className={`block rounded-full transition-all ${
                    gradino
                      ? "ring-2 ring-brand-vivid"
                      : preferito
                        ? "ring-2 ring-brand"
                        : "ring-1 ring-border group-hover:ring-brand"
                  }`}
                >
                  <AvatarGiocatore
                    firstName={v.first_name}
                    lastName={v.last_name}
                    photoKey={v.photo_key}
                    dimensione={60}
                  />
                </span>
                {gradino && (
                  <span className="score absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-vivid text-[10px] font-bold text-on-brand">
                    {ETICHETTE[gradino].breve}
                  </span>
                )}
                {preferito && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] text-on-brand">
                    ♥
                  </span>
                )}
              </span>
              <span className="flex w-full flex-col items-center leading-tight">
                <span className="w-full truncate text-center text-[11px] font-bold uppercase tracking-tight">
                  {v.last_name}
                </span>
                {v.jersey_number && (
                  <span className="score text-[10px] text-muted">
                    {v.jersey_number}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={inCorso || !scelte.best}
        className="taglio-sm display cursor-pointer bg-brand px-4 py-3.5 text-xl text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-default disabled:opacity-40"
      >
        {inCorso ? "Invio…" : scelte.best ? "Vota" : "Scegli il migliore"}
      </button>
      <p className="text-xs text-muted">
        Solo il migliore è obbligatorio. Un voto per partita, non
        modificabile: i voti individuali restano privati, si pubblicano solo
        gli aggregati.
      </p>
    </form>
  );
}

// Un gradino del podio: vuoto è un invito, pieno è una scelta da poter
// disfare. Il gradino di cui si sta parlando ha il bordo rosso.
function Casella({
  gradino,
  scelto,
  attivo,
  saltato,
  onSvuota,
}: {
  gradino: Gradino;
  scelto: Votabile | undefined;
  attivo: boolean;
  saltato: boolean;
  onSvuota: () => void;
}) {
  const etichetta = ETICHETTE[gradino];

  return (
    <button
      type="button"
      onClick={onSvuota}
      disabled={!scelto}
      aria-label={
        scelto
          ? `Togli ${scelto.first_name} ${scelto.last_name} da ${etichetta.lunga}`
          : etichetta.lunga
      }
      className={`taglio-sm flex flex-1 flex-col items-center justify-end gap-1 px-1 pb-1.5 pt-2 transition-colors ${ALTEZZA[gradino]} ${
        scelto
          ? "cursor-pointer border border-brand bg-brand-tint"
          : attivo
            ? "border border-dashed border-brand-vivid bg-surface-2"
            : `border border-dashed border-border ${saltato ? "opacity-50" : ""}`
      }`}
    >
      <span
        className={`score text-[11px] font-bold ${
          scelto || attivo ? "text-brand-vivid" : "text-muted"
        }`}
      >
        {etichetta.breve}
      </span>
      {scelto ? (
        <>
          <AvatarGiocatore
            firstName={scelto.first_name}
            lastName={scelto.last_name}
            photoKey={scelto.photo_key}
            dimensione={36}
          />
          <span className="w-full truncate text-center text-[10px] font-bold uppercase tracking-tight">
            {scelto.last_name}
          </span>
        </>
      ) : (
        <span className="text-[10px] text-muted">
          {saltato ? "saltato" : "libero"}
        </span>
      )}
    </button>
  );
}
