"use client";

// Barra di navigazione principale, mobile-first: solo icone, 5 voci.
// Tutte le pagine per esteso stanno nel menu laterale (menu-laterale.tsx).
// La voce attiva porta il "taglio": un cuneo rosso inclinato.

import Link from "next/link";
import { usePathname } from "next/navigation";

const voci = [
  { href: "/", label: "Home", icona: IconaCasa },
  { href: "/calendario", label: "Partite", icona: IconaCalendario },
  { href: "/voto", label: "Voto e classifiche", icona: IconaVoto },
  { href: "/news", label: "News", icona: IconaNews },
  { href: "/video", label: "Video", icona: IconaVideo },
  { href: "/giocatori", label: "La squadra", icona: IconaSquadra },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg justify-around">
        {voci.map(({ href, label, icona: Icona }) => {
          const attiva =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="relative flex-1">
              {attiva && (
                <span
                  aria-hidden
                  className="absolute -top-px left-1/2 h-[3px] w-8 -translate-x-1/2 -skew-x-[24deg] bg-brand-vivid"
                />
              )}
              <Link
                href={href}
                aria-label={label}
                title={label}
                className={`flex flex-col items-center py-3 transition-colors ${
                  attiva ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <Icona attiva={attiva} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function IconaCasa({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function IconaCalendario({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

// Stella: "vota il migliore in campo"
function IconaVoto({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.6l6.3-.8Z" />
    </svg>
  );
}

function IconaNews({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function IconaVideo({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3Z" />
    </svg>
  );
}

function IconaSquadra({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 15.5a5.5 5.5 0 0 1 5.5 4.5" />
    </svg>
  );
}
