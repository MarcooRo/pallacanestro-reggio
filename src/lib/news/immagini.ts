// Le foto citate nel corpo di un articolo, risolte dalla libreria al
// momento di comporre la pagina. Il blocco porta solo l'assetId: url,
// misure e caption stanno qui, in un posto solo, e valgono sia per
// /news/[slug] sia per l'anteprima in /admin/news/[id].

import { inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { mediaAssets } from "@/src/db/schema";
import { assetIdsDelCorpo, type Blocco } from "@/src/lib/news/blocchi";

export interface ImmagineCorpo {
  url: string;
  width: number | null;
  height: number | null;
  /** La descrizione scritta in libreria: diventa l'alt. */
  caption: string | null;
}

/** Mappa assetId → foto. Gli id che non esistono più restano fuori: il
 *  rendering salta il blocco invece di mostrare un'immagine rotta. */
export type ImmaginiCorpo = Record<string, ImmagineCorpo>;

export async function risolviImmaginiCorpo(
  corpo: Blocco[] | null,
): Promise<ImmaginiCorpo> {
  if (!corpo) return {};
  const ids = assetIdsDelCorpo(corpo);
  if (ids.length === 0) return {};

  const righe = await db
    .select({
      id: mediaAssets.id,
      url: mediaAssets.url,
      width: mediaAssets.width,
      height: mediaAssets.height,
      caption: mediaAssets.caption,
    })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, ids));

  return Object.fromEntries(
    righe.map(({ id, ...resto }) => [id, resto]),
  );
}

/** Gli url delle foto del corpo, nell'ordine dei blocchi: servono ai dati
 *  strutturati e a fare da copertina di scorta nelle condivisioni. */
export function urlImmaginiCorpo(
  corpo: Blocco[] | null,
  immagini: ImmaginiCorpo,
): string[] {
  if (!corpo) return [];
  return corpo
    .filter((b) => b.t === "immagine")
    .map((b) => (b.t === "immagine" ? immagini[b.assetId]?.url : undefined))
    .filter((url): url is string => Boolean(url));
}
