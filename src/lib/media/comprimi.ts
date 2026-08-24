// Compressione intelligente dei media all'ingresso. Le foto arrivano dai
// telefoni (3-8 MB) ma servono al web e ai social, dove oltre i 2560px di
// lato e una qualità 82 nessuno vede differenze. Regole:
//   - lato lungo max 2560px, mai ingrandire
//   - senza trasparenza → JPEG (mozjpeg, q82); con trasparenza → PNG
//   - l'orientamento EXIF si cuoce nei pixel (rotate); il resto dei
//     metadati si scarta — la data di scatto va letta PRIMA di comprimere
//   - il risultato si tiene solo se fa risparmiare almeno il 10%:
//     un originale già ottimizzato resta com'è

import { eq } from "drizzle-orm";
import sharp from "sharp";

import { db } from "@/src/db";
import { mediaAssets } from "@/src/db/schema";
import { leggiFile, salvaFile } from "@/src/lib/media/archivio";

export const LATO_MAX = 2560;
const RISPARMIO_MINIMO = 0.9; // il candidato vince se pesa ≤ 90% dell'originale

export interface Compresso {
  dati: Buffer;
  /** Il formato del file restituito ("jpeg" | "png" | "webp") */
  formato: string;
}

export async function comprimi(originale: Buffer): Promise<Compresso> {
  const meta = await sharp(originale).metadata();
  const formatoOriginale = meta.format ?? "";

  const base = sharp(originale)
    .rotate() // applica l'orientamento EXIF ai pixel
    .resize({
      width: LATO_MAX,
      height: LATO_MAX,
      fit: "inside",
      withoutEnlargement: true,
    });

  const conAlpha = Boolean(meta.hasAlpha);
  const candidato = conAlpha
    ? await base.png({ compressionLevel: 9, palette: true }).toBuffer()
    : await base
        .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" })
        .toBuffer();

  const ridotta =
    (meta.width ?? 0) > LATO_MAX || (meta.height ?? 0) > LATO_MAX;
  const raddrizzata = (meta.orientation ?? 1) !== 1;

  // Né ridotta né raddrizzata e risparmio sotto la soglia: meglio i byte
  // originali che una ricompressione inutile.
  if (
    !ridotta &&
    !raddrizzata &&
    candidato.length > originale.length * RISPARMIO_MINIMO
  ) {
    return { dati: originale, formato: formatoOriginale };
  }
  return { dati: candidato, formato: conAlpha ? "png" : "jpeg" };
}

export interface EsitoRicompressione {
  compressi: number;
  lasciati: number;
  byteRisparmiati: number;
}

/**
 * Passa una volta sull'archivio esistente e ricomprime gli asset "ready"
 * pesanti, MANTENENDO formato e chiave (niente URL da aggiornare in giro).
 * Idempotente: al secondo giro non trova più nulla da fare.
 */
export async function ricomprimiArchivio(): Promise<EsitoRicompressione> {
  const esito: EsitoRicompressione = {
    compressi: 0,
    lasciati: 0,
    byteRisparmiati: 0,
  };

  for (const asset of await db.select().from(mediaAssets)) {
    if (asset.status !== "ready" || !asset.bytes) continue;

    const originale = await leggiFile(asset.storageKey);
    if (!originale) continue;

    const meta = await sharp(originale).metadata();
    const formato = meta.format ?? "";
    const base = sharp(originale).rotate().resize({
      width: LATO_MAX,
      height: LATO_MAX,
      fit: "inside",
      withoutEnlargement: true,
    });

    // Stesso formato dell'esistente: la chiave (e quindi l'URL) non cambia.
    let candidato: Buffer;
    if (formato === "jpeg") {
      candidato = await base
        .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" })
        .toBuffer();
    } else if (formato === "png") {
      candidato = await base.png({ compressionLevel: 9, palette: true }).toBuffer();
    } else if (formato === "webp") {
      candidato = await base.webp({ quality: 82 }).toBuffer();
    } else {
      esito.lasciati += 1;
      continue;
    }

    if (candidato.length > originale.length * RISPARMIO_MINIMO) {
      esito.lasciati += 1;
      continue;
    }

    await salvaFile(asset.storageKey, candidato);
    const dopo = await sharp(candidato).metadata();
    await db
      .update(mediaAssets)
      .set({
        width: dopo.width ?? asset.width,
        height: dopo.height ?? asset.height,
        bytes: candidato.length,
      })
      .where(eq(mediaAssets.id, asset.id));

    esito.compressi += 1;
    esito.byteRisparmiati += originale.length - candidato.length;
  }

  return esito;
}
