import type { NextConfig } from "next";

import { LIMITE_UPLOAD_MB } from "./src/lib/media/limiti";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Le foto dal telefono per la libreria media (default: 1mb). Il numero
      // vive in src/lib/media/limiti.ts: la pagina admin lo mostra e blocca
      // la selezione troppo grossa prima di inviarla.
      bodySizeLimit: `${LIMITE_UPLOAD_MB}mb`,
    },
  },
  images: {
    // Da Next 16 i path locali con query string sono bloccati di default:
    // le anteprime OG (/api/og/...?p=...&sig=...) vanno dichiarate qui.
    // search omesso = qualunque query, che qui non apre nulla: l'endpoint
    // esige comunque la firma HMAC e risponde 401 senza.
    localPatterns: [{ pathname: "/api/og/**" }],
    remotePatterns: [
      // CDN immagini LBA (foto giocatori, loghi, news)
      { protocol: "https", hostname: "lba-media.s3.eu-south-1.amazonaws.com" },
      // loghi delle squadre di coppa (BCL)
      { protocol: "https", hostname: "assets.fiba.basketball" },
      // immagini delle news societarie
      { protocol: "https", hostname: "www.pallacanestroreggiana.it" },
      // thumbnail dei video YouTube
      { protocol: "https", hostname: "i.ytimg.com" },
      // il nostro archivio media, servito dalla route /media (URL assoluti)
      { protocol: "https", hostname: "tiforeggiana.it" },
      // TEMPORANEO (solo anteprima locale): il DB di sviluppo ha ancora 12
      // URL del vecchio storage Supabase. Da togliere dopo il fix dei dati.
      { protocol: "https", hostname: "thiptbtgofaazpbwabkb.supabase.co" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
