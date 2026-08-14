import type { MetadataRoute } from "next";

import { getArticoliPerSitemap } from "@/src/lib/news/queries";
import { urlSito } from "@/src/lib/sito";

// Sitemap: le pagine stabili più gli articoli nostri pubblicati. Senza
// questo file un articolo nuovo può restare mesi fuori dall'indice, perché
// nessuno ci linka da fuori.
//
// Restano FUORI di proposito: le pagine di lettura delle news di fonte
// (testo di altri: indicizzarne la copia è contenuto duplicato), le schede
// giocatore e partita (pagine di dati, non di lettura) e tutto ciò che è
// dietro accesso.

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSito();

  const stabili = ["", "/news", "/calendario", "/classifica", "/giocatori", "/video", "/voto"];

  const articoli = await getArticoliPerSitemap();

  return [
    ...stabili.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...articoli
      .filter((a) => a.slug)
      .map((a) => ({
        url: `${base}/news/${a.slug}`,
        // Google guarda questa data: è l'ultima modifica vera, non "oggi"
        lastModified: a.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
  ];
}
