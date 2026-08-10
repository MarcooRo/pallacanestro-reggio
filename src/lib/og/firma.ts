// Firma HMAC degli URL OG: senza firma valida l'endpoint risponde 401.
// Impedisce a chiunque di usare il dominio come generatore di immagini
// arbitrarie. La firma copre il JSON ESATTO dei parametri (stringa, non
// oggetto): niente canonicalizzazione, chi firma e chi verifica usano
// la stessa stringa.

import { createHmac, timingSafeEqual } from "node:crypto";

function segreto(): string {
  const s = process.env.OG_SIGNING_SECRET?.trim();
  if (!s) {
    throw new Error(
      "OG_SIGNING_SECRET non impostata: serve per firmare gli URL delle immagini (in locale .env.local, su Vercel in Settings → Environment Variables)",
    );
  }
  return s;
}

export function firmaParametri(template: string, paramsJson: string): string {
  return createHmac("sha256", segreto())
    .update(`${template}\n${paramsJson}`)
    .digest("hex");
}

export function verificaFirma(
  template: string,
  paramsJson: string,
  firma: string | null,
): boolean {
  if (!firma) return false;
  const attesa = Buffer.from(firmaParametri(template, paramsJson), "hex");
  let ricevuta: Buffer;
  try {
    ricevuta = Buffer.from(firma, "hex");
  } catch {
    return false;
  }
  return attesa.length === ricevuta.length && timingSafeEqual(attesa, ricevuta);
}

/**
 * L'URL firmato dell'immagine. `base` vuota = URL relativo (per la pagina
 * admin); assoluta (da urlBase()) per l'MCP e per il render server-side.
 */
export function signOgUrl(template: string, params: unknown, base = ""): string {
  const p = JSON.stringify(params);
  const sig = firmaParametri(template, p);
  return `${base}/api/og/${template}?p=${encodeURIComponent(p)}&sig=${sig}`;
}
