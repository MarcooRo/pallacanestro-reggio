// Filtro a pillola inclinata, coerente col "taglio" del design system.

import Link from "next/link";

export function Pillola({
  href,
  attiva,
  children,
}: {
  href: string;
  attiva: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`-skew-x-[14deg] px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
        attiva
          ? "bg-brand text-on-brand"
          : "border border-border text-muted hover:border-brand hover:text-foreground"
      }`}
    >
      <span className="inline-block skew-x-[14deg]">{children}</span>
    </Link>
  );
}
