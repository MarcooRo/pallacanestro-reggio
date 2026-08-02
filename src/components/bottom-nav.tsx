"use client";

// Barra di navigazione principale, mobile-first. La voce attiva porta
// il "taglio": un cuneo rosso inclinato, la firma del design system.

import Link from "next/link";
import { usePathname } from "next/navigation";

const voci = [
  { href: "/", label: "Home", icona: IconaCasa },
  { href: "/calendario", label: "Partite", icona: IconaCalendario },
  { href: "/classifiche", label: "Classifiche", icona: IconaTrofeo },
  { href: "/giocatori", label: "Squadra", icona: IconaSquadra },
  { href: "/news", label: "News", icona: IconaNews },
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
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  attiva ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <Icona attiva={attiva} />
                {label}
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
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function IconaCalendario({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconaTrofeo({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1" />
    </svg>
  );
}

function IconaSquadra({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 15.5a5.5 5.5 0 0 1 5.5 4.5" />
    </svg>
  );
}

function IconaNews({ attiva }: { attiva: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${attiva ? "text-brand-vivid" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
