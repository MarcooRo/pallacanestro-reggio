"use client";

// Menu laterale a scomparsa: la mappa completa dell'app, con le voci
// per esteso. La bottom bar (solo icone) copre la navigazione veloce.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const voci = [
  { href: "/", label: "Home" },
  { href: "/calendario", label: "Partite" },
  { href: "/voto", label: "Voto e classifiche" },
  { href: "/news", label: "News" },
  { href: "/video", label: "Video" },
  { href: "/giocatori", label: "La squadra" },
  { href: "/profilo", label: "Profilo" },
] as const;

export function MenuLaterale({ admin = false }: { admin?: boolean }) {
  const [aperto, setAperto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!aperto) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [aperto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        aria-label="Apri il menu"
        className="-m-2 cursor-pointer p-2 text-muted transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </button>

      {aperto && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Chiudi il menu"
            onClick={() => setAperto(false)}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
          />
          {/* Superficie più chiara dello sfondo pagina, sennò si confonde */}
          <nav className="absolute inset-y-0 left-0 flex w-64 flex-col gap-1 border-r border-border-strong bg-surface px-5 py-6 shadow-[8px_0_30px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={() => setAperto(false)}
              aria-label="Chiudi il menu"
              className="-m-2 mb-4 cursor-pointer self-start p-2 text-muted transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>

            {voci.map(({ href, label }) => {
              const attiva =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setAperto(false)}
                  className={`display border-l-2 py-2 pl-3 text-xl transition-colors ${
                    attiva
                      ? "border-brand-vivid text-brand-vivid"
                      : "border-transparent text-foreground hover:border-border"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {admin && (
              <Link
                href="/admin"
                onClick={() => setAperto(false)}
                className="display mt-4 border-l-2 border-transparent py-2 pl-3 text-xl text-muted transition-colors hover:border-border hover:text-foreground"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
