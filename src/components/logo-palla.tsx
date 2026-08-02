// Loghino: palla da basket in tinta brand. Le cuciture sono nel colore
// di sfondo, così la palla si "ritaglia" da sola sull'header scuro.

export function LogoPalla({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="10" fill="var(--brand-vivid)" />
      <g stroke="var(--sfondo)" strokeWidth="1.4" fill="none">
        <path d="M10 0v20" />
        <path d="M0 10h20" />
        <path d="M2.93 2.93c4.13 4.13 4.13 10 0 14.14" />
        <path d="M17.07 2.93c-4.13 4.13-4.13 10 0 14.14" />
      </g>
    </svg>
  );
}
