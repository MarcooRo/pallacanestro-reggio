// L'origine pubblica con cui l'utente sta navigando in questo momento.
// Serve ai link che dalle email rientrano nell'app (recupero password):
// presa dalla richiesta, così locale, preview e produzione funzionano
// senza una variabile d'ambiente in più da tenere allineata.

import { headers } from "next/headers";

export async function urlBase(): Promise<string> {
  const intestazioni = await headers();
  const host = intestazioni.get("x-forwarded-host") ?? intestazioni.get("host");
  if (!host) throw new Error("Richiesta senza host: impossibile costruire l'URL");
  const protocollo =
    intestazioni.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocollo}://${host}`;
}

// I "next" che arrivano da fuori (email, query string) possono puntare
// dove vogliono: si accettano solo percorsi interni.
export function percorsoInterno(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
