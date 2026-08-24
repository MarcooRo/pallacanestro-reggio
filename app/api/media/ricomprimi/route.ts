// TEMPORANEA: ricomprime una tantum gli asset già in archivio (stesse
// chiavi, stessi URL — cambiano solo i byte). Protetta dal bearer MCP.
// Da rimuovere a lavoro verificato.

import { NextResponse, type NextRequest } from "next/server";

import { ricomprimiArchivio } from "@/src/lib/media/comprimi";
import { bearerMcpValido } from "@/src/lib/social/bearer";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!bearerMcpValido(request.headers.get("authorization"))) {
    return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  }
  return NextResponse.json(await ricomprimiArchivio());
}
