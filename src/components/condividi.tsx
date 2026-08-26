"use client";

// CTA di condivisione dell'articolo: su mobile apre il widget nativo
// (navigator.share), su desktop copia l'url negli appunti con conferma.
// La distinzione non è sul supporto a navigator.share (ce l'hanno anche
// Safari e Edge desktop) ma sul puntatore: touch = foglio di condivisione,
// mouse = copia, che sul desktop è il gesto che uno si aspetta.

import { useState } from "react";

export function Condividi({ url, titolo }: { url: string; titolo: string }) {
  const [copiato, setCopiato] = useState(false);

  async function condividi() {
    const mobile =
      typeof navigator.share === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    if (mobile) {
      try {
        await navigator.share({ title: titolo, url });
      } catch {
        // Annullato dall'utente o negato: nessun errore da mostrare
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      // Appunti non disponibili (permessi, contesto non sicuro):
      // il prompt permette comunque di copiare a mano
      window.prompt("Copia il link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={condividi}
      className="taglio-sm flex cursor-pointer items-center gap-2 self-start border border-border-strong bg-surface px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-brand hover:text-brand-vivid"
    >
      <span aria-hidden className="text-brand-vivid">↗</span>{" "}
      {copiato ? "Link copiato!" : "Condividi"}
    </button>
  );
}
