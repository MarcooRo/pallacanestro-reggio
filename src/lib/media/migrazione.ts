// Trasloco una tantum dei file media da Supabase Storage all'archivio
// locale, con aggiornamento degli URL nel database. I bucket erano
// pubblici: si scarica dai vecchi URL, senza chiavi. Idempotente: le righe
// già locali si saltano, quindi rilanciarlo non fa danni.

import { eq, isNotNull } from "drizzle-orm";

import { db } from "@/src/db";
import { mediaAssets, socialMediaItems } from "@/src/db/schema";
import { salvaFile, urlFile } from "@/src/lib/media/archivio";

export interface EsitoMigrazione {
  portati: number;
  giaAPosto: number;
  falliti: string[];
}

async function scarica(url: string): Promise<Buffer | null> {
  const risposta = await fetch(url).catch(() => null);
  if (!risposta?.ok) return null;
  return Buffer.from(await risposta.arrayBuffer());
}

export async function migraMedia(): Promise<EsitoMigrazione> {
  const esito: EsitoMigrazione = { portati: 0, giaAPosto: 0, falliti: [] };

  // 1) La libreria foto
  for (const asset of await db.select().from(mediaAssets)) {
    if (!asset.url.includes("supabase")) {
      esito.giaAPosto += 1;
      continue;
    }
    const dati = await scarica(asset.url);
    if (!dati) {
      // pending senza file, o già sparito: la riga resta com'è
      esito.falliti.push(`asset ${asset.id} (${asset.url})`);
      continue;
    }
    await salvaFile(asset.storageKey, dati);
    await db
      .update(mediaAssets)
      .set({ url: urlFile(asset.storageKey) })
      .where(eq(mediaAssets.id, asset.id));
    esito.portati += 1;
  }

  // 2) I render social già pubblicati (bucket "social", chiave postId/pos.jpg)
  for (const item of await db
    .select()
    .from(socialMediaItems)
    .where(isNotNull(socialMediaItems.renderedUrl))) {
    const url = item.renderedUrl!;
    if (!url.includes("supabase")) {
      esito.giaAPosto += 1;
      continue;
    }
    const dati = await scarica(url);
    if (!dati) {
      esito.falliti.push(`render ${item.id} (${url})`);
      continue;
    }
    const chiave = `social/${item.postId}/${item.position}.jpg`;
    await salvaFile(chiave, dati);
    await db
      .update(socialMediaItems)
      .set({ renderedUrl: urlFile(chiave) })
      .where(eq(socialMediaItems.id, item.id));
    esito.portati += 1;
  }

  return esito;
}
