// Il bearer token dell'MCP: chi chiama è un processo, non un browser, e
// non può fare il login del sito. Confronto a tempo costante, stessa
// filosofia del CRON_SECRET.

import { timingSafeEqual } from "node:crypto";

function atteso(): string | undefined {
  const t = process.env.MCP_BEARER_TOKEN?.trim();
  return t || undefined;
}

export function bearerMcpValido(authorization: string | null): boolean {
  const token = atteso();
  if (!token) return false;
  const ricevuto = authorization?.trim();
  if (!ricevuto?.startsWith("Bearer ")) return false;
  const a = Buffer.from(ricevuto.slice("Bearer ".length));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
