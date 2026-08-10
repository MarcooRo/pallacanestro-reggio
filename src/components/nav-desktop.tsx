"use client";

// Navigazione desktop: le voci per esteso nell'header, da lg in su.
// Sotto lg non esiste — lì navigano la bottom bar e il menu laterale.
// La voce attiva porta lo stesso taglio rosso della bottom bar.

import Link from "next/link";
import { usePathname } from "next/navigation";

const voci = [
  { href: "/", label: "Home" },
  { href: "/calendario", label: "Partite" },
  { href: "/classifica", label: "Classifica" },
  { href: "/voto", label: "Voto" },
  { href: "/giocatori", label: "Squadra" },
  { href: "/news", label: "News" },
  { href: "/video", label: "Video" },
] as const;

export function NavDesktop() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:block">
      <ul className="flex items-center gap-6">
        {voci.map(({ href, label }) => {
          const attiva =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="relative">
              {attiva && (
                <span
                  aria-hidden
                  className="absolute -bottom-1.5 left-1/2 h-[3px] w-6 -translate-x-1/2 -skew-x-[24deg] bg-brand-vivid"
                />
              )}
              <Link
                href={href}
                className={`display text-sm uppercase tracking-wide transition-colors ${
                  attiva ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
