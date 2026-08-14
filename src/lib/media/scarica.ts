// Scarico di un'immagine da un URL esterno, per la libreria media.
//
// Qui l'indirizzo arriva da fuori — dall'admin o, peggio, da un modello via
// MCP — quindi la richiesta la fa il nostro server verso una destinazione
// che non abbiamo scelto noi: è SSRF per costruzione. I paletti, tutti
// obbligatori:
//
//   1. solo http/https, niente file:, data:, gopher:
//   2. l'host deve risolvere a un indirizzo PUBBLICO: niente localhost,
//      niente rete privata, e soprattutto niente 169.254.169.254 (i
//      metadati dell'istanza cloud, con le credenziali dentro)
//   3. i redirect si seguono a mano, ricontrollando OGNI salto: seguirli
//      con fetch vanificherebbe il punto 2 al primo 302 verso 127.0.0.1
//   4. tetto ai byte letti davvero, non al solo Content-Length dichiarato
//   5. timeout, altrimenti un URL che non risponde tiene su la function
//
// Resta una finestra teorica di DNS rebinding (fetch risolve di nuovo il
// nome dopo il nostro controllo): per chiuderla servirebbe un dispatcher
// undici che pinni l'IP. Sproporzionato qui, dove il tool è dietro bearer
// token e ruolo admin.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { LIMITE_IMPORT_MB, MB } from "@/src/lib/media/limiti";

const MAX_REDIRECT = 3;
const TIMEOUT_MS = 15_000;

/** Errore con messaggio spendibile: lo leggono l'admin e i modelli via MCP. */
export class ErroreScarico extends Error {}

function ipPrivato(ip: string): boolean {
  // ::ffff:10.0.0.1 è 10.0.0.1 travestito da IPv6
  if (ip.toLowerCase().startsWith("::ffff:")) return ipPrivato(ip.slice(7));

  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // metadati istanza cloud
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast e riservati
    return false;
  }

  const g = ip.toLowerCase();
  if (g === "::" || g === "::1") return true;
  if (g.startsWith("fe80")) return true; // link-local
  if (g.startsWith("fc") || g.startsWith("fd")) return true; // unique local
  return false;
}

/** Valida schema e host; torna l'URL normalizzato o alza ErroreScarico. */
async function controlla(indirizzo: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(indirizzo);
  } catch {
    throw new ErroreScarico(`"${indirizzo}" non è un URL valido.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ErroreScarico(
      `Schema "${url.protocol}" non ammesso: serve un URL http o https che punti direttamente al file immagine.`,
    );
  }

  // In un URL un IPv6 letterale sta tra parentesi quadre: senza toglierle
  // isIP non lo riconosce e "[::1]" finirebbe a farsi risolvere dal DNS.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const indirizzi = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new ErroreScarico(
          `L'host "${host}" non si risolve: controlla l'indirizzo.`,
        );
      });

  if (indirizzi.length === 0 || indirizzi.some((i) => ipPrivato(i.address))) {
    throw new ErroreScarico(
      `L'host "${host}" punta a un indirizzo di rete interna: si scaricano solo immagini da host pubblici.`,
    );
  }
  return url;
}

export interface ImmagineScaricata {
  buffer: Buffer;
  /** L'URL finale, dopo i redirect: è quello che salviamo come provenienza. */
  url: string;
  mime: string | null;
}

/**
 * Scarica un'immagine da URL con tutti i paletti sopra. NON valida che i
 * byte siano davvero un'immagine: lo fa `leggiMetadati` con sharp, che è
 * l'unico giudice del formato in tutto il progetto.
 */
export async function scaricaImmagine(
  indirizzo: string,
): Promise<ImmagineScaricata> {
  let url = await controlla(indirizzo);

  for (let salto = 0; salto <= MAX_REDIRECT; salto += 1) {
    let risposta: Response;
    try {
      risposta = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // Alcuni CDN rispondono 403 a un client senza Accept credibile
          accept: "image/*,*/*;q=0.8",
        },
      });
    } catch (err) {
      throw new ErroreScarico(
        `Scarico fallito da ${url.hostname}: ${err instanceof Error ? err.message : err}`,
      );
    }

    if (risposta.status >= 300 && risposta.status < 400) {
      const destinazione = risposta.headers.get("location");
      if (!destinazione) {
        throw new ErroreScarico(
          `${url.href} risponde ${risposta.status} senza dire dove andare.`,
        );
      }
      // Ogni salto ripassa dai controlli: è il punto 3 dei paletti
      url = await controlla(new URL(destinazione, url).href);
      continue;
    }

    if (!risposta.ok || !risposta.body) {
      throw new ErroreScarico(
        `${url.href} risponde ${risposta.status}: l'immagine non è raggiungibile (se è dietro login o hotlink protection non si può prendere).`,
      );
    }

    const mime = risposta.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
    if (mime && (mime.startsWith("text/") || mime === "application/json")) {
      throw new ErroreScarico(
        `Quell'URL restituisce ${mime}, non un'immagine: serve il link diretto al file (tasto destro sull'immagine → "Copia indirizzo immagine"), non la pagina che la contiene.`,
      );
    }

    const tetto = LIMITE_IMPORT_MB * MB;
    const dichiarati = Number(risposta.headers.get("content-length") ?? 0);
    if (dichiarati > tetto) {
      throw new ErroreScarico(
        `L'immagine pesa ${(dichiarati / MB).toFixed(1)} MB, oltre il limite di ${LIMITE_IMPORT_MB} MB.`,
      );
    }

    // Si legge a pezzi e si conta: il Content-Length è una dichiarazione,
    // non una garanzia (e può mancare del tutto con chunked encoding).
    const pezzi: Uint8Array[] = [];
    let letti = 0;
    for await (const pezzo of risposta.body as unknown as AsyncIterable<Uint8Array>) {
      letti += pezzo.byteLength;
      if (letti > tetto) {
        throw new ErroreScarico(
          `L'immagine supera il limite di ${LIMITE_IMPORT_MB} MB mentre la si scarica.`,
        );
      }
      pezzi.push(pezzo);
    }
    if (letti === 0) throw new ErroreScarico(`${url.href} ha risposto vuoto.`);

    return { buffer: Buffer.concat(pezzi), url: url.href, mime };
  }

  throw new ErroreScarico(
    `Troppi redirect (più di ${MAX_REDIRECT}) partendo da ${indirizzo}.`,
  );
}
