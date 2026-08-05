import { ImageResponse } from "next/og";

import { branding } from "@/src/branding";

// Favicon: il loghino palla (logo-palla.tsx) generato server-side.
// Qui il CSS non arriva, quindi i colori vengono da branding.colori —
// così il favicon segue da sé il branding official/generic.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const { vivo, scuro } = branding.colori;
  return new ImageResponse(
    (
      <svg
        viewBox="0 0 20 20"
        width={size.width}
        height={size.height}
        style={{ width: "100%", height: "100%" }}
      >
        <circle cx="10" cy="10" r="10" fill={vivo} />
        <g stroke={scuro} strokeWidth="1.4" fill="none">
          <path d="M10 0v20" />
          <path d="M0 10h20" />
          <path d="M2.93 2.93c4.13 4.13 4.13 10 0 14.14" />
          <path d="M17.07 2.93c-4.13 4.13-4.13 10 0 14.14" />
        </g>
      </svg>
    ),
    { ...size },
  );
}
