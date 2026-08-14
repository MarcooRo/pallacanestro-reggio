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
    remotePatterns: [
      // CDN immagini LBA (foto giocatori, loghi, news)
      { protocol: "https", hostname: "lba-media.s3.eu-south-1.amazonaws.com" },
      // loghi delle squadre di coppa (BCL)
      { protocol: "https", hostname: "assets.fiba.basketball" },
      // immagini delle news societarie
      { protocol: "https", hostname: "www.pallacanestroreggiana.it" },
      // thumbnail dei video YouTube
      { protocol: "https", hostname: "i.ytimg.com" },
      // JPEG dei post social sul bucket pubblico Supabase
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
