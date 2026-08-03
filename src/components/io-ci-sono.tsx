"use client";

// "Io ci sono": un tap e un contatore, niente di più. Il contatore si mostra
// solo da una soglia in su — con pochi partecipanti un numero piccolo
// scoraggia invece di trascinare.

import { useState, useTransition } from "react";

import { dichiaraPresenza } from "@/src/lib/presenza/actions";
import type { StatoPresenza } from "@/src/lib/presenza/queries";

const SOGLIA_CONTATORE = 10;

export function IoCiSono({
  matchId,
  statoIniziale,
  loggato,
}: {
  matchId: string;
  statoIniziale: StatoPresenza;
  loggato: boolean;
}) {
  const [stato, setStato] = useState(statoIniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function tap() {
    if (!loggato || inCorso) return;
    const precedente = stato;
    setStato({
      ciSono: !stato.ciSono,
      quanti: stato.quanti + (stato.ciSono ? -1 : 1),
    });
    setErrore(null);

    avvia(async () => {
      const esito = await dichiaraPresenza(matchId);
      if (esito.stato) setStato(esito.stato);
      else {
        setStato(precedente);
        setErrore(esito.errore ?? "Non è stato possibile registrare la scelta");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={tap}
        disabled={!loggato}
        aria-pressed={stato.ciSono}
        className={`taglio-sm display px-5 py-2.5 text-lg transition-colors ${
          stato.ciSono
            ? "border border-brand bg-brand-tint text-brand-vivid"
            : "bg-brand text-on-brand hover:bg-brand-hover"
        } ${loggato ? "" : "cursor-default opacity-70"}`}
      >
        {stato.ciSono ? "Ci sarò ✓" : "Io ci sono"}
      </button>

      {stato.quanti >= SOGLIA_CONTATORE && (
        <span className="text-sm text-muted">
          <span className="score font-bold tabular-nums text-foreground">
            {stato.quanti}
          </span>{" "}
          tifosi ci saranno
        </span>
      )}
      {errore && <span className="text-xs text-brand-vivid">{errore}</span>}
    </div>
  );
}
