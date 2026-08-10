// Generazione delle immagini social: GET /api/og/[template]?p=<json>&sig=<hmac>
//
// Runtime Node e non edge, deliberatamente: ImageResponse funziona anche
// qui (default di Next 16), i font si leggono da fs e la firma HMAC usa
// node:crypto — lo stesso helper firma.ts che usano admin e MCP.
//
// Ordine dei controlli: prima la firma (401), poi il template (404), poi
// i parametri (400 con l'errore Zod leggibile, mai un'immagine rotta).

import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verificaFirma } from "@/src/lib/og/firma";
import { fontOg } from "@/src/lib/og/font";
import { dimensioniTemplate, getTemplateOg, nomiTemplateOg } from "@/src/lib/og/registry";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ template: string }> },
) {
  const { template } = await params;
  const query = request.nextUrl.searchParams;
  const p = query.get("p");
  const sig = query.get("sig");

  if (!p || !verificaFirma(template, p, sig)) {
    return NextResponse.json(
      { errore: "firma mancante o non valida: gli URL vanno generati con signOgUrl" },
      { status: 401 },
    );
  }

  const def = getTemplateOg(template);
  if (!def) {
    return NextResponse.json(
      { errore: `template "${template}" inesistente`, disponibili: nomiTemplateOg() },
      { status: 404 },
    );
  }

  let grezzi: unknown;
  try {
    grezzi = JSON.parse(p);
  } catch {
    return NextResponse.json(
      { errore: "il parametro p non è JSON valido" },
      { status: 400 },
    );
  }

  const esito = def.schema.safeParse(grezzi);
  if (!esito.success) {
    return NextResponse.json(
      {
        errore: `parametri non validi per "${template}"`,
        dettaglio: z.prettifyError(esito.error),
        esempio: def.esempio,
      },
      { status: 400 },
    );
  }

  return new ImageResponse(def.render(esito.data), {
    ...dimensioniTemplate(def),
    fonts: await fontOg(),
  });
}
