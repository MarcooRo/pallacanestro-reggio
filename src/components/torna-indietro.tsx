"use client";

// CTA per uscire dalle pagine di dettaglio: torna da dove sei arrivato
// (history) o alla sezione di appartenenza se il link era diretto.

import { useRouter } from "next/navigation";

export function TornaIndietro({
  fallback,
  etichetta,
}: {
  fallback: string;
  etichetta: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="eyebrow -ml-1 flex items-center gap-1.5 self-start px-1 py-1 transition-colors hover:text-brand-vivid"
    >
      <span aria-hidden>←</span> {etichetta}
    </button>
  );
}
