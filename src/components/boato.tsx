"use client";

// Il boato: si tappa a ripetizione e si vede l'onda di tutta la tifoseria.
//
// Il feedback del singolo tap è LOCALE e immediato (l'animazione e la
// vibrazione partono subito): l'onda condivisa arriva ogni pochi secondi
// dalla rotta cacheata, e va bene così — l'onda è un aggregato, non un
// riscontro al tuo dito.
//
// Tutto ciò che dipende dall'orologio (finestra della gara, normalizzazione
// dell'onda) vive dentro il ciclo del timer, non nel corpo del componente:
// il render deve restare puro e uguale a sé stesso.

import { useEffect, useRef, useState } from "react";

import { mandaTap } from "@/src/lib/boato/actions";
import {
  ANTICIPO_MS,
  BUCKET_ONDA,
  DURATA_MASSIMA_MS,
  INTERVALLO_INVIO_MS,
  normalizzaOnda,
  type Bucket,
} from "@/src/lib/boato/regole";

interface DatiOnda {
  bucket: Bucket[];
  picco: number;
  totale: number;
}

interface Vista {
  /** Altezze 0..1, dalla più vecchia alla più recente */
  onda: number[];
  totale: number;
}

const ONDA_VUOTA: number[] = new Array(BUCKET_ONDA).fill(0);

export function Boato({
  matchId,
  inizio,
  statoIniziale,
}: {
  matchId: string;
  /** ISO: il componente è client, la Date non attraversa il confine */
  inizio: string;
  /** matches.status dal database (colonna text con check, non un enum TS) */
  statoIniziale: string;
}) {
  // 'attesa' finché non si sa (o finché la palla a due è lontana): il primo
  // render deve essere identico a quello del server.
  const [finestra, setFinestra] = useState<"attesa" | "aperta" | "chiusa">("attesa");
  const [vista, setVista] = useState<Vista>({ onda: ONDA_VUOTA, totale: 0 });
  const [miei, setMiei] = useState(0);
  const [pulsa, setPulsa] = useState(false);
  // I tap non ancora inviati: un ref, perché cambiano a ogni dito e non
  // devono far ridisegnare nulla.
  const daInviare = useRef(0);
  const timerPulsa = useRef<ReturnType<typeof setTimeout>>(undefined);

  const gioca = statoIniziale === "scheduled" || statoIniziale === "live";

  useEffect(() => {
    if (!gioca) return;

    const inizioMs = new Date(inizio).getTime();
    const apertura = inizioMs - ANTICIPO_MS;
    const chiusura = inizioMs + DURATA_MASSIMA_MS;

    let smontato = false;
    let inVolo = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function giro() {
      if (smontato || inVolo) return;

      const ora = Date.now();
      // Prima della finestra si aspetta la palla a due invece di chiedere
      // a vuoto; dopo, si smette del tutto.
      if (ora < apertura) {
        timer = setTimeout(giro, Math.min(apertura - ora, 60_000));
        return;
      }
      if (ora > chiusura) {
        setFinestra("chiusa");
        return;
      }
      setFinestra("aperta");

      inVolo = true;
      try {
        // Prima si consegnano i tap accumulati, poi si legge l'onda: così il
        // proprio contributo è già dentro a quello che si vede.
        const quanti = daInviare.current;
        if (quanti > 0) {
          daInviare.current = 0;
          const esito = await mandaTap(matchId, quanti);
          if (esito.chiuso) {
            if (!smontato) setFinestra("chiusa");
            return;
          }
        }

        const risposta = await fetch(`/api/boato/${matchId}`);
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const dati = (await risposta.json()) as DatiOnda;
        if (smontato) return;
        setVista({
          onda: normalizzaOnda(dati.bucket, dati.picco, new Date(), BUCKET_ONDA),
          totale: dati.totale,
        });
      } catch {
        // Rete o database in difficoltà: si tiene l'onda che c'è già.
      } finally {
        inVolo = false;
      }

      if (!smontato) timer = setTimeout(giro, INTERVALLO_INVIO_MS);
    }

    // Primo giro in un timer e non qui: nel corpo dell'effetto non si
    // aggiorna lo stato (cascata di render).
    timer = setTimeout(giro, 0);
    return () => {
      smontato = true;
      clearTimeout(timer);
      clearTimeout(timerPulsa.current);
    };
  }, [matchId, inizio, gioca]);

  if (!gioca || finestra !== "aperta") return null;

  function tap() {
    // Nessun account: il primo invio di tap crea da sé l'identità anonima.
    daInviare.current += 1;
    setMiei((n) => n + 1);
    setPulsa(true);
    clearTimeout(timerPulsa.current);
    timerPulsa.current = setTimeout(() => setPulsa(false), 110);
    // Vibrazione dove c'è: sull'iPhone non esiste, e non è un problema.
    navigator.vibrate?.(12);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="display text-2xl">
          Il <span className="text-brand-vivid">boato</span>
        </h2>
        {vista.totale > 0 && (
          <span className="eyebrow">
            <span className="score font-bold tabular-nums">{vista.totale}</span> in
            tutta la curva
          </span>
        )}
      </div>

      <div className="taglio flex flex-col gap-4 card p-4">
        {/* L'onda: un bucket da 10 secondi per barra, gli ultimi 5 minuti.
            L'altezza è relativa al picco della serata, non al numero di
            collegati: così la curva racconta i momenti, non l'audience. */}
        <div
          role="img"
          aria-label="Intensità del boato negli ultimi cinque minuti"
          className="flex h-16 items-end gap-[2px]"
        >
          {vista.onda.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-[height] duration-500 ${
                v > 0 ? "bg-brand-vivid" : "bg-border"
              }`}
              style={{ height: `${Math.max(3, v * 100)}%`, opacity: 0.35 + v * 0.65 }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={tap}
          aria-label="Fai sentire il boato"
          className={`taglio display cursor-pointer select-none bg-brand py-6 text-3xl text-on-brand transition-transform duration-100 active:bg-brand-hover ${
            pulsa ? "scale-[1.03]" : "scale-100"
          }`}
        >
          BOATO
        </button>

        <p className="text-xs text-muted">
          {miei > 0 ? (
            <>
              Il tuo contributo:{" "}
              <span className="score font-bold tabular-nums text-foreground">
                {miei}
              </span>{" "}
              — tappa a ripetizione nei momenti caldi.
            </>
          ) : (
            "Tappa a ripetizione nei momenti caldi: l'onda è la somma di tutta la curva."
          )}
        </p>
      </div>
    </section>
  );
}
