// Trasloca i file media da Supabase all'archivio locale (vedi
// src/lib/media/migrazione.ts). Idempotente.
// Uso (sul server, come reggiana): bun --env-file=.env scripts/migra-media.ts

import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // assente sul server: le env arrivano da --env-file
}

const { migraMedia } = await import("@/src/lib/media/migrazione");
const esito = await migraMedia();

for (const f of esito.falliti) console.warn(`  fallito: ${f}`);
console.log(
  `Migrazione media: ${esito.portati} portati, ${esito.giaAPosto} già a posto, ${esito.falliti.length} falliti.`,
);
process.exit(esito.falliti.length > 0 ? 1 : 0);
