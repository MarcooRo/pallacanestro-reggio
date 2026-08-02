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
      className="taglio-sm flex cursor-pointer items-center gap-2 self-start border border-border-strong bg-surface px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-brand hover:text-brand-vivid"
    >
      <span aria-hidden className="text-brand-vivid">←</span> {etichetta}
    </button>
  );
}
