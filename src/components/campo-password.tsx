"use client";

// Campo password con l'occhio per mostrarla in chiaro. Client component
// perché la visibilità è stato locale: il resto del form (accesso,
// registrazione) resta server con la sua server action.

import { useState } from "react";

export function CampoPassword({
  id = "password",
  name = "password",
  autoComplete,
  minLength = 8,
}: {
  id?: string;
  name?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const [visibile, setVisibile] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visibile ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="taglio-sm w-full border border-border-strong bg-surface-2 px-3 py-3 pr-12 outline-none transition-colors focus:border-brand-vivid"
      />
      {/* type="button": dentro al form non deve inviare nulla */}
      <button
        type="button"
        onClick={() => setVisibile((v) => !v)}
        aria-label={visibile ? "Nascondi la password" : "Mostra la password"}
        aria-pressed={visibile}
        className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-muted transition-colors hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {visibile ? (
            // Occhio barrato: la password è in chiaro, il tap la nasconde
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.2A9.6 9.6 0 0 1 12 5c5 0 9 5 9 7 0 .7-.5 1.7-1.4 2.8" />
              <path d="M6.5 7.1C3.9 8.7 3 11.2 3 12c0 2 4 7 9 7 1.7 0 3.2-.6 4.4-1.4" />
              <path d="M9.9 10.1a3 3 0 0 0 4.1 4.2" />
            </>
          ) : (
            <>
              <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
