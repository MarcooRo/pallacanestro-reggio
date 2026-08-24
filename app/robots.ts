import type { MetadataRoute } from "next";

import { urlSito } from "@/src/lib/sito";

// robots.txt generato. Fuori dall'indice tutto ciò che è personale o di
// servizio: l'admin, le API, il profilo e le pagine di accesso. Il resto è
// aperto, crawler delle AI compresi (GPTBot, ClaudeBot, PerplexityBot...):
// senza accesso non c'è citazione, e qui non c'è nulla da proteggere.
// Se un domani si vuole escluderli, si aggiunge una regola per user agent.

export default function robots(): MetadataRoute.Robots {
  const base = urlSito();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/profilo"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
