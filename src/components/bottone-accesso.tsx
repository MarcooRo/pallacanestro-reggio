"use client";

// CTA che apre il dialog "serve l'account" invece di navigare: si usa dove
// la pagina è server (es. la sezione voto della partita) e l'ospite non
// deve perdere quello che sta guardando per registrarsi.

import { useChiediAccesso } from "@/src/components/accesso-richiesto";

export function BottoneAccesso({
  azione,
  children,
}: {
  /** Completa "Per ___ serve un account" nel dialog */
  azione: string;
  children: React.ReactNode;
}) {
  const chiediAccesso = useChiediAccesso();

  return (
    <button
      type="button"
      onClick={() => chiediAccesso(azione)}
      className="taglio-sm display cursor-pointer self-start bg-brand px-5 py-2.5 text-lg text-on-brand transition-colors hover:bg-brand-hover"
    >
      {children}
    </button>
  );
}
