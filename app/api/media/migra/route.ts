// TEMPORANEA: esegue il trasloco dei media da Supabase all'archivio locale,
// dall'interno dell'app (che ha i permessi giusti sul filesystem). Protetta
// dal bearer MCP. Da rimuovere a migrazione verificata.

import { NextResponse, type NextRequest } from "next/server";

import { migraMedia } from "@/src/lib/media/migrazione";
import { bearerMcpValido } from "@/src/lib/social/bearer";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!bearerMcpValido(request.headers.get("authorization"))) {
    return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  }
  return NextResponse.json(await migraMedia());
}
