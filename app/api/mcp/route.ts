// Server MCP remoto: POST /api/mcp, transport streamable-http in modalità
// stateless — ogni richiesta è un messaggio JSON-RPC, la risposta è JSON
// secco (niente stream SSE, niente sessione: su serverless non c'è un
// processo che viva tra due richieste). I client MCP la supportano: è la
// forma canonica dei server remoti su piattaforme serverless.
//
// Autenticazione: bearer token fisso (MCP_BEARER_TOKEN). Chi chiama è un
// processo, non un browser — niente login del sito. Tutto ciò che questo
// endpoint crea risulta source: 'mcp' e nasce draft.

import { NextResponse, type NextRequest } from "next/server";

import { bearerMcpValido } from "@/src/lib/social/bearer";
import { elencoToolMcp, eseguiToolMcp } from "@/src/lib/social/mcp";

export const runtime = "nodejs";

const VERSIONI_SUPPORTATE = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface MessaggioJsonRpc {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: {
    protocolVersion?: string;
    name?: string;
    arguments?: unknown;
  };
}

function risposta(id: MessaggioJsonRpc["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function erroreRpc(id: MessaggioJsonRpc["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

export async function POST(request: NextRequest) {
  if (!bearerMcpValido(request.headers.get("authorization"))) {
    return NextResponse.json(
      { errore: "bearer token mancante o sbagliato (header Authorization: Bearer <MCP_BEARER_TOKEN>)" },
      { status: 401 },
    );
  }

  let msg: MessaggioJsonRpc;
  try {
    msg = await request.json();
  } catch {
    return erroreRpc(null, -32700, "corpo non è JSON valido");
  }
  if (Array.isArray(msg)) {
    return erroreRpc(null, -32600, "batch non supportato: un messaggio per richiesta");
  }

  // Notifiche (niente id): si accettano e basta.
  if (msg.id === undefined || msg.id === null) {
    return new NextResponse(null, { status: 202 });
  }

  const base = new URL(request.url).origin;

  switch (msg.method) {
    case "initialize": {
      const chiesta = msg.params?.protocolVersion;
      return risposta(msg.id, {
        protocolVersion: VERSIONI_SUPPORTATE.includes(chiesta ?? "")
          ? chiesta
          : VERSIONI_SUPPORTATE[0],
        capabilities: { tools: {} },
        serverInfo: { name: "pallacanestro-reggio-social", version: "1.0.0" },
        instructions:
          "Coda dei contenuti social di Pallacanestro Reggiana. Grafiche: list_og_templates per i template, preview_media per provarne una, queue_post per la bozza. Foto proprie: list_media per la libreria (caption e tags sono la guida per scegliere); una slide può essere {assetId} nudo o {assetId, template} per una composizione tipo foto-con-testo. La pubblicazione NON passa da qui: ogni post nasce draft e lo approva un umano da /admin/social. Non esiste un tool che pubblica.",
      });
    }
    case "ping":
      return risposta(msg.id, {});
    case "tools/list":
      return risposta(msg.id, { tools: elencoToolMcp() });
    case "tools/call": {
      const nome = msg.params?.name ?? "";
      const { testo, errore } = await eseguiToolMcp(nome, msg.params?.arguments, { base });
      return risposta(msg.id, {
        content: [{ type: "text", text: testo }],
        isError: errore,
      });
    }
    default:
      return erroreRpc(msg.id, -32601, `metodo "${msg.method}" non supportato`);
  }
}

// Il transport streamable-http prevede GET per il canale di notifiche
// server→client: questo server non ne manda, e lo dice col 405.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
