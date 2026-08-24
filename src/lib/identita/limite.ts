// Rate limit minimalista in memoria: il processo è uno solo (systemd, mai
// cluster), quindi una Map basta. Protegge dagli script, non dagli eserciti.

const contatori = new Map<string, { n: number; scade: number }>();

export function concediPerIp(
  chiave: string,
  max: number,
  finestraMs: number,
): boolean {
  const ora = Date.now();
  const c = contatori.get(chiave);
  if (!c || c.scade < ora) {
    // Pulizia pigra: si passa di qui comunque, e la mappa non cresce oltre
    // gli IP visti nell'ultima finestra.
    if (contatori.size > 10_000) {
      for (const [k, v] of contatori) if (v.scade < ora) contatori.delete(k);
    }
    contatori.set(chiave, { n: 1, scade: ora + finestraMs });
    return true;
  }
  c.n += 1;
  return c.n <= max;
}

/** L'IP del client, passato da Caddy. In dev non c'è: vale "locale". */
export function ipDaHeaders(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "locale";
}
