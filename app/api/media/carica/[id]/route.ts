// L'upload firmato: il PUT del file di un asset "pending", autorizzato dal
// token HMAC emesso da creaUploadFirmato (src/lib/media/libreria.ts).
// Sostituisce i signed upload URL di Supabase Storage: stessa idea, il
// token vale per un solo asset e il file finisce nell'archivio locale.

import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/src/db";
import { mediaAssets } from "@/src/db/schema";
import { salvaFile } from "@/src/lib/media/archivio";
import { verificaFirmaUpload } from "@/src/lib/media/firma-upload";
import { LIMITE_IMPORT_MB, MB } from "@/src/lib/media/limiti";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!verificaFirmaUpload(id, token)) {
    return NextResponse.json({ errore: "token non valido" }, { status: 401 });
  }

  const [asset] = await db
    .select({ storageKey: mediaAssets.storageKey, status: mediaAssets.status })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  if (!asset) {
    return NextResponse.json({ errore: "asset inesistente" }, { status: 404 });
  }
  if (asset.status !== "pending") {
    return NextResponse.json({ errore: "asset già finalizzato" }, { status: 409 });
  }

  const corpo = Buffer.from(await request.arrayBuffer());
  if (corpo.length === 0) {
    return NextResponse.json({ errore: "corpo vuoto" }, { status: 400 });
  }
  if (corpo.length > LIMITE_IMPORT_MB * MB) {
    return NextResponse.json(
      { errore: `file oltre i ${LIMITE_IMPORT_MB} MB` },
      { status: 413 },
    );
  }

  await salvaFile(asset.storageKey, corpo);
  return new NextResponse(null, { status: 204 });
}
