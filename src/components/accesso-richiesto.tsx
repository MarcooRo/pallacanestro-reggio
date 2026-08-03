"use client";

// Il dialog "serve l'account". Chi guarda da ospite può toccare qualunque
// CTA: al tap non trova un bottone spento ma questa richiesta, che dice
// cosa si sblocca e offre registrazione o accesso.
//
// Provider nel root layout + hook: i componenti che partecipano (voto,
// boato, reazioni, pronostici, "io ci sono") chiamano chiediAccesso("…")
// invece di mostrare un link inline ciascuno.

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ChiediAccesso = (azione?: string) => void;

const Contesto = createContext<ChiediAccesso>(() => {});

/** Apre il dialog. `azione` completa "Per ___ serve un account". */
export function useChiediAccesso(): ChiediAccesso {
  return useContext(Contesto);
}

export function ProviderAccesso({ children }: { children: React.ReactNode }) {
  const [azione, setAzione] = useState<string | null>(null);

  const chiedi = useCallback<ChiediAccesso>((cosa) => {
    setAzione(cosa ?? "partecipare");
  }, []);

  useEffect(() => {
    if (!azione) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setAzione(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [azione]);

  return (
    <Contesto.Provider value={chiedi}>
      {children}
      {azione !== null && (
        <Dialog azione={azione} chiudi={() => setAzione(null)} />
      )}
    </Contesto.Provider>
  );
}

function Dialog({ azione, chiudi }: { azione: string; chiudi: () => void }) {
  // Portal sul body: il backdrop-blur dell'header crea un containing block
  // e il fixed resterebbe intrappolato nell'header (cfr. menu-laterale).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titolo-accesso"
        className="taglio relative flex w-full max-w-sm flex-col gap-4 border border-border-strong bg-surface-2 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col gap-2">
          <h2 id="titolo-accesso" className="display text-2xl">
            Serve l&apos;account<span className="text-brand-vivid">.</span>
          </h2>
          <p className="text-sm text-muted">
            Per {azione} serve un account: email e password, dieci secondi. I
            tuoi voti restano privati, si vedono solo gli aggregati.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/registrati"
            onClick={chiudi}
            className="taglio-sm display bg-brand px-5 py-3 text-center text-xl text-on-brand transition-colors hover:bg-brand-hover"
          >
            Registrati
          </Link>
          <Link
            href="/accesso"
            onClick={chiudi}
            className="taglio-sm display border border-border-strong px-5 py-2.5 text-center text-lg transition-colors hover:border-brand hover:text-brand-vivid"
          >
            Ho già un account
          </Link>
          <button
            type="button"
            onClick={chiudi}
            className="eyebrow cursor-pointer py-1 transition-colors hover:text-foreground"
          >
            continua a guardare
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
