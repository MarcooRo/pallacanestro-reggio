"use client";

// I pronostici della partita. Domande libere, scritte dall'admin di volta in
// volta. Due passaggi (scegli, conferma) perché la risposta non si può
// cambiare: un tap solo, e un dito fuori posto brucerebbe la domanda.
//
// Appena hai risposto compare la distribuzione della tifoseria: è il pezzo
// che fa tornare, e resta un aggregato — non si vede mai chi ha detto cosa.

import { useState, useTransition } from "react";

import { useChiediAccesso } from "@/src/components/accesso-richiesto";
import { rispondi } from "@/src/lib/pronostici/actions";
import {
  distribuzioneVisibile,
  type PronosticoPubblico,
} from "@/src/lib/pronostici/regole";

export function Pronostici({
  iniziali,
  loggato,
}: {
  iniziali: PronosticoPubblico[];
  loggato: boolean;
}) {
  const [pronostici, setPronostici] = useState(iniziali);
  const [errore, setErrore] = useState<string | null>(null);

  if (pronostici.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="display text-2xl">
        Il <span className="text-brand-vivid">pronostico</span>
      </h2>

      {pronostici.map((p) => (
        <Domanda
          key={p.id}
          pronostico={p}
          loggato={loggato}
          onRisposta={(aggiornati) => {
            setPronostici(aggiornati);
            setErrore(null);
          }}
          onErrore={setErrore}
        />
      ))}

      {errore && <p className="text-xs text-brand-vivid">{errore}</p>}
    </section>
  );
}

function Domanda({
  pronostico,
  loggato,
  onRisposta,
  onErrore,
}: {
  pronostico: PronosticoPubblico;
  loggato: boolean;
  onRisposta: (aggiornati: PronosticoPubblico[]) => void;
  onErrore: (messaggio: string) => void;
}) {
  const [selezionata, setSelezionata] = useState<number | null>(null);
  const [inCorso, avvia] = useTransition();
  const chiediAccesso = useChiediAccesso();

  const aperto = pronostico.status === "open";
  const risolto = pronostico.status === "resolved";
  const annullato = pronostico.status === "voided";
  const puoRispondere = aperto && loggato && pronostico.mia === null;
  // Da ospite le opzioni restano toccabili: il tap chiede l'account invece
  // di mostrare una domanda inerte (la distribuzione è nascosta comunque,
  // finché non hai risposto).
  const invitaAccesso = aperto && !loggato;
  const mostraDistribuzione = distribuzioneVisibile(pronostico);

  function conferma() {
    if (selezionata === null || inCorso) return;
    avvia(async () => {
      const esito = await rispondi(pronostico.id, selezionata);
      if (esito.pronostici) onRisposta(esito.pronostici);
      else onErrore(esito.errore ?? "Non è stato possibile registrare la risposta");
    });
  }

  return (
    <div className="taglio flex flex-col gap-3 card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-bold">{pronostico.question}</p>
        {annullato ? (
          <span className="eyebrow">annullato</span>
        ) : risolto ? (
          <span className="eyebrow text-brand-vivid">risolto</span>
        ) : !aperto ? (
          <span className="eyebrow">chiuso</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        {pronostico.opzioni.map((voce, i) => {
          const quante = pronostico.distribuzione[i] ?? 0;
          const quota =
            pronostico.totale > 0 ? Math.round((quante / pronostico.totale) * 100) : 0;
          const mia = pronostico.mia === i;
          const corretta = risolto && pronostico.corretta === i;

          if (puoRispondere || invitaAccesso) {
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  invitaAccesso ? chiediAccesso("pronosticare") : setSelezionata(i)
                }
                aria-pressed={selezionata === i}
                className={`taglio-sm cursor-pointer border px-3 py-2.5 text-left text-sm transition-colors ${
                  selezionata === i
                    ? "border-brand bg-brand-tint text-brand-vivid"
                    : "border-border hover:border-brand"
                }`}
              >
                {voce}
              </button>
            );
          }

          return (
            <div
              key={i}
              className={`taglio-sm relative overflow-hidden border px-3 py-2.5 text-sm ${
                corretta
                  ? "border-brand"
                  : mia
                    ? "border-border-strong"
                    : "border-border"
              }`}
            >
              {/* La barra è dietro al testo: la percentuale si legge comunque */}
              {mostraDistribuzione && (
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${corretta ? "bg-brand-tint" : "bg-surface-2"}`}
                  style={{ width: `${quota}%` }}
                />
              )}
              <span className="relative flex items-baseline justify-between gap-2">
                <span className={corretta ? "font-bold text-brand-vivid" : ""}>
                  {voce}
                  {mia && <span className="eyebrow ml-2">la tua</span>}
                </span>
                {mostraDistribuzione && (
                  <span className="score shrink-0 tabular-nums text-muted">
                    {quota}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {puoRispondere && (
        <button
          type="button"
          onClick={conferma}
          disabled={selezionata === null || inCorso}
          className="taglio-sm display self-start bg-brand px-5 py-2 text-lg text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {inCorso ? "Invio…" : "Conferma"}
        </button>
      )}

      {invitaAccesso && (
        <p className="text-xs text-muted">
          Tocca la tua risposta: serve un account per pronosticare.
        </p>
      )}

      {mostraDistribuzione && pronostico.totale > 0 && (
        <p className="eyebrow">
          {pronostico.totale} {pronostico.totale === 1 ? "risposta" : "risposte"}
          {pronostico.mia !== null && aperto ? " · la tua è registrata" : ""}
        </p>
      )}
    </div>
  );
}
