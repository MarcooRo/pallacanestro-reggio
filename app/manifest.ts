import type { MetadataRoute } from "next";

import { branding } from "@/src/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.appName,
    short_name: branding.appShortName,
    description: branding.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: branding.colori.primario,
    icons: [
      { src: "/icons/icona-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icona-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icona-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
