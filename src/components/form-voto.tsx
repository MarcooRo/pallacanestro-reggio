"use client";

// La scheda voto: quattro campi, un submit. Le regole vere stanno nella
// server action; qui solo UX (campi, errori, disabilitazione).

import { useActionState } from "react";

import { esprimiVoto, type StatoVoto } from "@/src/lib/voto/actions";
import type { Votabile } from "@/src/lib/partite/queries";

function SelettoreGiocatore({
  name,
  label,
  votabili,
  obbligatorio = false,
  nota,
}: {
  name: string;
  label: string;
  votabili: Votabile[];
  obbligatorio?: boolean;
  nota?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
        {!obbligatorio && (
          <span className="ml-1 font-normal text-muted">(facoltativo)</span>
        )}
      </label>
      {nota && <p className="text-xs text-muted">{nota}</p>}
      <select
        id={name}
        name={name}
        required={obbligatorio}
        defaultValue=""
        className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand"
      >
        <option value="">{obbligatorio ? "Scegli il giocatore…" : "Nessuno"}</option>
        {votabili.map((v) => (
          <option key={v.player_id} value={v.player_id}>
            {v.jersey_number ? `${v.jersey_number} · ` : ""}
            {v.first_name} {v.last_name}
          </option>
        ))}
      </select>
    </div>
  );
}

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

  if (stato.ok) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm">
        <strong>Voto registrato.</strong> La pagella si vedrà alla chiusura
        della votazione.
      </p>
    );
  }

  return (
    <form action={azione} className="flex flex-col gap-4">
      <input type="hidden" name="matchId" value={matchId} />

      {stato.errore && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm text-brand">
          {stato.errore}
        </p>
      )}

      <SelettoreGiocatore
        name="bestPlayerId"
        label="Migliore in campo"
        votabili={votabili}
        obbligatorio
      />
      <SelettoreGiocatore
        name="optionalAId"
        label="Menzione A"
        votabili={votabili}
        nota="Le due menzioni non sono ordinate: valgono uguale."
      />
      <SelettoreGiocatore name="optionalBId" label="Menzione B" votabili={votabili} />
      <SelettoreGiocatore
        name="favoritePlayerId"
        label="Il tuo preferito"
        votabili={votabili}
        nota="Può coincidere col migliore: prestazione e affetto sono domande diverse."
      />

      <button
        type="submit"
        disabled={inCorso}
        className="rounded-md bg-brand px-4 py-3 font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-50"
      >
        {inCorso ? "Invio…" : "Vota"}
      </button>
      <p className="text-xs text-muted">
        Un voto per partita, non modificabile. I voti individuali restano
        privati: si pubblicano solo gli aggregati.
      </p>
    </form>
  );
}
