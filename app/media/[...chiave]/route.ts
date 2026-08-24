// Serve i file dell'archivio media, uno alla volta: nessun elenco, nessuna
// cartella esposta. Le chiavi contengono UUID, quindi non si indovinano;
// i tentativi di risalire il filesystem (..) muoiono in archivio.percorso.

import { NextResponse } from "next/server";

import { leggiFile } from "@/src/lib/media/archivio";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chiave: string[] }> },
) {
  const chiave = (await params).chiave.join("/");

  let dati: Buffer | null;
  try {
    dati = await leggiFile(chiave);
  } catch {
    dati = null;
  }
  if (!dati) return new NextResponse(null, { status: 404 });

  const estensione = chiave.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(dati), {
    headers: {
      "Content-Type": MIME[estensione] ?? "application/octet-stream",
      // Le chiavi non si riusano (UUID) e i render sovrascritti cambiano
      // URL con la ?v=: la cache può essere eterna.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
