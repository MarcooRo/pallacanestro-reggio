"use client";

// "Io ci sono": un tap e un contatore, niente di più. Il contatore c'è
// sempre: nascondendolo sotto una soglia si vedeva solo la propria scelta e
// il bottone sembrava non contare niente. Sui numeri piccoli cambia la
// frase, non la presenza del dato — "sii il primo" tira più di un "1".

import { useState, useTransition } from "react";

import { dichiaraPresenza } from "@/src/lib/presenza/actions";
import type { StatoPresenza } from "@/src/lib/presenza/queries";

// Come si racconta il contatore, a seconda di quanti sono e se ci sei tu.
// Il numero resta separato dalla coda per tenerlo in mono da tabellone.
function frase({ quanti, ciSono }: StatoPresenza): {
  numero: number | null;
  coda: string;
} {
  if (quanti === 0) {
    return { numero: null, coda: "nessuno ancora, sii il primo" };
  }
  if (quanti === 1 && ciSono) return { numero: null, coda: "per ora solo tu" };
  return {
    numero: quanti,
    coda: quanti === 1 ? "tifoso ci sarà" : "tifosi ci saranno",
  };
}

export function IoCiSono({
  matchId,
  statoIniziale,
}: {
  matchId: string;
  statoIniziale: StatoPresenza;
}) {
  const [stato, setStato] = useState(statoIniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function tap() {
    if (inCorso) return;
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

  const { numero, coda } = frase(stato);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={tap}
        aria-pressed={stato.ciSono}
        className={`taglio-sm display cursor-pointer px-3.5 py-1.5 text-sm transition-colors ${
          stato.ciSono
            ? "border border-brand bg-brand-tint text-brand-vivid"
            : "bg-brand text-on-brand hover:bg-brand-hover"
        }`}
      >
        {stato.ciSono ? "Ci sarò ✓" : "Io ci sono"}
      </button>

      <span aria-live="polite" className="text-xs text-muted">
        {numero !== null && (
          <>
            <span className="score font-bold tabular-nums text-foreground">
              {numero}
            </span>{" "}
          </>
        )}
        {coda}
      </span>
      {errore && <span className="text-xs text-brand-vivid">{errore}</span>}
    </div>
  );
}
