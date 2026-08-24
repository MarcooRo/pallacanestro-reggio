// Trasloca i file media da Supabase Storage all'archivio locale e aggiorna
// gli URL nel database. I bucket erano pubblici: si scarica dai vecchi URL,
// senza bisogno di chiavi Supabase. Idempotente: salta ciò che è già locale.
// Uso (sul server, come reggiana): bun --env-file=.env scripts/migra-media.ts

import { loadEnvFile } from "node:process";

import { eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { mediaAssets, socialMediaItems } from "@/src/db/schema";
import { salvaFile, urlFile } from "@/src/lib/media/archivio";

try {
  loadEnvFile(".env.local");
} catch {
  // assente sul server: le env arrivano da --env-file
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { casing: "snake_case" });

async function scarica(url: string): Promise<Buffer | null> {
  const risposta = await fetch(url).catch(() => null);
  if (!risposta?.ok) return null;
  return Buffer.from(await risposta.arrayBuffer());
}

let portati = 0;
let saltati = 0;
let falliti = 0;

// 1) La libreria foto
for (const asset of await db.select().from(mediaAssets)) {
  if (!asset.url.includes("supabase")) {
    saltati += 1;
    continue;
  }
  const dati = await scarica(asset.url);
  if (!dati) {
    // pending senza file, o già sparito: la riga resta com'è
    console.warn(`  asset ${asset.id}: download fallito da ${asset.url}`);
    falliti += 1;
    continue;
  }
  await salvaFile(asset.storageKey, dati);
  await db
    .update(mediaAssets)
    .set({ url: urlFile(asset.storageKey) })
    .where(eq(mediaAssets.id, asset.id));
  portati += 1;
}

// 2) I render social già pubblicati (bucket "social", chiave postId/pos.jpg)
for (const item of await db
  .select()
  .from(socialMediaItems)
  .where(isNotNull(socialMediaItems.renderedUrl))) {
  const url = item.renderedUrl!;
  if (!url.includes("supabase")) {
    saltati += 1;
    continue;
  }
  const dati = await scarica(url);
  if (!dati) {
    console.warn(`  render ${item.id}: download fallito da ${url}`);
    falliti += 1;
    continue;
  }
  const chiave = `social/${item.postId}/${item.position}.jpg`;
  await salvaFile(chiave, dati);
  await db
    .update(socialMediaItems)
    .set({ renderedUrl: urlFile(chiave) })
    .where(eq(socialMediaItems.id, item.id));
  portati += 1;
}

await client.end();
console.log(`Migrazione media: ${portati} portati, ${saltati} già a posto, ${falliti} falliti.`);
