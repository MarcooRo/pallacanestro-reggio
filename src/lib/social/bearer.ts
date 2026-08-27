// Il bearer token dell'MCP: chi chiama è un processo, non un browser, e
// non può fare il login del sito. Confronto a tempo costante, stessa
// filosofia del CRON_SECRET.
//
// Il token si accetta anche come ?key= nell'URL: i connettori di claude.ai
// non hanno un campo per l'header (l'opzione "Nessuno" del loro form è
// pensata proprio per la chiave nell'URL). Con l'HTTPS la query non viaggia
// in chiaro; resta il fatto che l'URL col token È la credenziale, da
// trattare come una password.

import { timingSafeEqual } from "node:crypto";

function atteso(): string | undefined {
  const t = process.env.MCP_BEARER_TOKEN?.trim();
  return t || undefined;
}

function uguali(ricevuto: string, token: string): boolean {
  const a = Buffer.from(ricevuto);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function bearerMcpValido(
  authorization: string | null,
  chiaveUrl?: string | null,
): boolean {
  const token = atteso();
  if (!token) return false;
  const header = authorization?.trim();
  if (header?.startsWith("Bearer ") && uguali(header.slice("Bearer ".length), token)) {
    return true;
  }
  const chiave = chiaveUrl?.trim();
  return Boolean(chiave) && uguali(chiave!, token);
}
