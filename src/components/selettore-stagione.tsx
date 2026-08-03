"use client";

// Selezione della stagione come select nativo: su mobile apre il picker di
// sistema, sta sulla riga del titolo e non ruba una riga ai filtri (le
// pillole degli anni andavano a capo). Gli URL arrivano già fatti da chi
// conosce gli altri filtri: qui si naviga e basta.

import { useRouter } from "next/navigation";

export interface OpzioneStagione {
  valore: string;
  etichetta: string;
  href: string;
}

export function SelettoreStagione({
  opzioni,
  attiva,
}: {
  opzioni: OpzioneStagione[];
  attiva: string;
}) {
  const router = useRouter();

  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label="Stagione"
        value={attiva}
        onChange={(e) => {
          const scelta = opzioni.find((o) => o.valore === e.target.value);
          if (scelta) router.push(scelta.href);
        }}
        className="score cursor-pointer appearance-none border border-border bg-surface py-1.5 pl-3 pr-8 text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:border-brand focus:border-brand focus:outline-none"
      >
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.etichetta}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}
