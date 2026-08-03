"use client";

// Riga di reazioni al risultato. Il tap risponde subito (stato ottimistico)
// e poi si allinea a quello che dice il server: la reazione è un gesto da
// mezzo secondo, aspettare il round trip la farebbe sembrare rotta.

import Link from "next/link";
import { useState, useTransition } from "react";

import { reagisci } from "@/src/lib/reazioni/actions";
import type { StatoReazioni } from "@/src/lib/reazioni/queries";
import { REAZIONI } from "@/src/lib/reazioni/tipi";

export function Reazioni({
  matchId,
  statoIniziale,
  loggato,
}: {
  matchId: string;
  statoIniziale: StatoReazioni;
  loggato: boolean;
}) {
  const [stato, setStato] = useState(statoIniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function tap(code: string) {
    if (!loggato || inCorso) return;

    // Ottimistico: si sposta il conteggio come farà il server.
    const precedente = stato;
    const conteggi = { ...stato.conteggi };
    if (stato.mia) conteggi[stato.mia] = Math.max(0, (conteggi[stato.mia] ?? 0) - 1);
    const mia = stato.mia === code ? null : code;
    if (mia) conteggi[mia] = (conteggi[mia] ?? 0) + 1;
    setStato({
      conteggi,
      mia,
      totale: Object.values(conteggi).reduce((a, b) => a + b, 0),
    });
    setErrore(null);

    avvia(async () => {
      const esito = await reagisci(matchId, code);
      if (esito.stato) setStato(esito.stato);
      else {
        // Il server ha detto no: si torna a quello che c'era davvero.
        setStato(precedente);
        setErrore(esito.errore ?? "Non è stato possibile registrare la reazione");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {REAZIONI.map((r) => {
          const quante = stato.conteggi[r.code] ?? 0;
          const scelta = stato.mia === r.code;
          return (
            <button
              key={r.code}
              type="button"
              onClick={() => tap(r.code)}
              disabled={!loggato}
              aria-pressed={scelta}
              aria-label={r.etichetta}
              title={r.etichetta}
              className={`taglio-sm flex items-center gap-1.5 border px-3 py-2 text-sm transition-colors ${
                scelta
                  ? "border-brand bg-brand-tint text-brand-vivid"
                  : "border-border hover:border-brand"
              } ${loggato ? "" : "cursor-default opacity-70"}`}
            >
              <span aria-hidden className="text-base leading-none">
                {r.emoji}
              </span>
              <span className="score font-bold tabular-nums">{quante}</span>
            </button>
          );
        })}
      </div>

      {!loggato && (
        <p className="text-xs text-muted">
          <Link href="/accesso" className="font-bold text-brand-vivid underline">
            Accedi
          </Link>{" "}
          per dire la tua.
        </p>
      )}
      {errore && <p className="text-xs text-brand-vivid">{errore}</p>}
    </div>
  );
}
