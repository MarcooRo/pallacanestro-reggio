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

import {
  elencoToolNews,
  eseguiToolNews,
  esisteToolNews,
  nomiToolNews,
} from "@/src/lib/news/mcp";
import { bearerMcpValido } from "@/src/lib/social/bearer";
import { elencoToolMcp, eseguiToolMcp, nomiToolMcp } from "@/src/lib/social/mcp";

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
        serverInfo: { name: "pallacanestro-reggio-contenuti", version: "1.1.0" },
        instructions:
          "Contenuti di Pallacanestro Reggiana: coda social e articoli del sito. Grafiche social: list_og_templates per i template, preview_media per provarne una, queue_post per la bozza. Le piattaforme sono instagram_feed, instagram_story e facebook: un post esce su UNA piattaforma, quindi per coprirne più d'una si creano più post, con caption differenziata (Instagram: hashtag, niente link; Facebook: pochi hashtag, link ok — tipicamente all'articolo su tiforeggiana.it). Foto: list_media per la libreria (caption e tags sono la guida per scegliere; il campo origine dice se una foto è nostra o scaricata da un sito); una slide può essere {assetId} nudo o {assetId, template} per una composizione tipo foto-con-testo. Se l'immagine che ti serve è già online, import_media_url la mette in libreria senza passare dall'admin — ma non è un permesso di ripubblicare roba di altri: foto di agenzie, testate o altri club restano fuori. Articoli del sito: create_article con il corpo a blocchi. Il testo lungo si scrive nel blocco {t:'md'}, che accetta un sottoinsieme sicuro di markdown (**grassetto**, _corsivo_, [link](url), ## sottotitoli, elenchi, > citazioni): niente HTML, i tag resterebbero testo visibile. Le foto nel testo sono blocchi {t:'immagine', assetId} da list_media, con piena:true per una foto a tutta larghezza, oppure {t:'galleria', assetIds} per 2-6 foto in carosello. I widget sono blocchi {t:'grafico', tipo, params}: list_article_blocks dice quali esistono, e quelli che leggono il database (tabellino) vogliono un id da list_matches, non dei numeri scritti a mano — così il dato in pagina è sempre quello vero. Copertina dalla libreria, e in pagina la nota «Generato in parte con AI»; la firma della fonte è «Redazione», mai «Pallacanestro Reggiana» che sono le news ufficiali del club. La pubblicazione NON passa da qui: post e articoli nascono draft e li manda online un umano da /admin/social e /admin/news. Non esiste un tool che pubblica.",
      });
    }
    case "ping":
      return risposta(msg.id, {});
    case "tools/list":
      return risposta(msg.id, { tools: [...elencoToolMcp(), ...elencoToolNews()] });
    case "tools/call": {
      const nome = msg.params?.name ?? "";
      // Nome sconosciuto: l'elenco completo arriva da qui, che è il solo
      // posto che conosce entrambi i registry.
      if (!esisteToolNews(nome) && !nomiToolMcp().includes(nome)) {
        return risposta(msg.id, {
          content: [
            {
              type: "text",
              text: `Il tool "${nome}" non esiste. Tool disponibili: ${[...nomiToolMcp(), ...nomiToolNews()].join(", ")}. Nota: non esiste NESSUN tool che pubblica — post e articoli li manda online un umano dall'admin.`,
            },
          ],
          isError: true,
        });
      }
      // Due registry, un solo endpoint: il nome decide a chi tocca.
      const { testo, errore } = esisteToolNews(nome)
        ? await eseguiToolNews(nome, msg.params?.arguments, { base })
        : await eseguiToolMcp(nome, msg.params?.arguments, { base });
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
