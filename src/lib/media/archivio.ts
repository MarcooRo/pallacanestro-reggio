// L'archivio dei file media: una cartella sul disco della VPS (MEDIA_DIR,
// default /srv/reggiana/media), MAI esposta dal reverse proxy. I file
// escono solo dalla route /media/[...chiave], uno alla volta — niente
// elenchi, niente cartella navigabile. Sostituisce Supabase Storage
// (decisione del 24/08/2026, PROJECT_RE.md).

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { urlSito } from "@/src/lib/sito";

function radice(): string {
  return process.env.MEDIA_DIR || "/srv/reggiana/media";
}

/** Percorso assoluto di una chiave, rifiutando ogni tentativo di uscita. */
function percorso(chiave: string): string {
  const base = path.resolve(radice());
  const p = path.resolve(base, chiave);
  if (!p.startsWith(base + path.sep)) {
    throw new Error(`chiave media non valida: ${chiave}`);
  }
  return p;
}

export async function salvaFile(chiave: string, dati: Buffer): Promise<void> {
  const p = percorso(chiave);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, dati);
}

/** I byte della chiave, o null se il file non c'è. */
export async function leggiFile(chiave: string): Promise<Buffer | null> {
  try {
    return await readFile(percorso(chiave));
  } catch {
    return null;
  }
}

export async function cancellaFile(chiave: string): Promise<void> {
  await rm(percorso(chiave), { force: true });
}

/**
 * L'URL con cui la route /media serve la chiave. Assoluto: finisce nel
 * database e nelle risposte MCP, dove un percorso relativo non basta.
 */
export function urlFile(chiave: string): string {
  return `${urlSito()}/media/${chiave}`;
}
