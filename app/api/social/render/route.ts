// POST /api/social/render — rigenera i JPEG di un post.
// Runtime node esplicito: sharp non esiste su edge.
//
// Chi può chiamarlo: l'admin loggato (la pagina admin lo usa per
// "rigenera immagini") oppure il processo MCP col suo bearer token.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getProfilo } from "@/src/lib/auth/session";
import { bearerMcpValido } from "@/src/lib/social/bearer";
import { renderizzaPost } from "@/src/lib/social/render";

export const runtime = "nodejs";

const corpo = z.object({ postId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const daMcp = bearerMcpValido(request.headers.get("authorization"));
  if (!daMcp) {
    const profilo = await getProfilo();
    if (!profilo || profilo.role !== "admin") {
      return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
    }
  }

  const esito = corpo.safeParse(await request.json().catch(() => null));
  if (!esito.success) {
    return NextResponse.json(
      { errore: "corpo atteso: { postId: <uuid> }" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await renderizzaPost(esito.data.postId));
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ errore: messaggio }, { status: 500 });
  }
}
