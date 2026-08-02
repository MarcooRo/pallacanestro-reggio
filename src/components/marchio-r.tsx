// Il marchio "R" del logo Pallacanestro Reggiana: le due linee estratte
// dal badge ufficiale (public/logo-pallacanestro-reggiana.svg).
// fill="currentColor": il colore lo decide chi lo usa (rosso, negativo…).

export function MarchioR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48.1 37" className={className} aria-hidden>
      <g fill="currentColor" transform="translate(-36.888 -37.127)">
        <path d="M73.6507 61.6493L65.957 55.5159L70.6963 49.6566C71.3933 48.8866 71.4108 48.0933 71.2154 47.6471C71.0142 47.195 70.4834 46.9676 69.6318 46.9676H47.2884C41.8549 46.9676 36.8881 42.5607 36.8881 37.1272H69.6347C74.4469 37.1272 78.3988 39.5684 80.2129 43.6602C82.027 47.755 81.1957 52.6402 78.0955 56.1458L73.6536 61.6493H73.6507Z" />
        <path d="M47.7229 74.1145V60.9843C47.7229 59.8731 48.4345 59.4094 48.7437 59.2636C49.1841 59.0507 49.887 58.9369 50.7153 59.599C53.4072 61.7514 61.6434 68.261 69.0601 74.1145H84.9435C77.483 68.2319 60.8968 55.1425 56.8604 51.914C53.2614 49.0354 48.5191 48.455 44.4827 50.3945C40.4141 52.3514 37.8884 56.4083 37.8884 60.9843V74.1145H47.7287H47.7229Z" />
      </g>
    </svg>
  );
}
