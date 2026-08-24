// L'identità anonima vive in un cookie firmato: "<uuid>.<firma>". La firma
// (HMAC del solo id con AUTH_SECRET) impedisce di fabbricarsi il token di
// qualcun altro; il valore non è un segreto e una copia di riserva sta in
// localStorage (src/components/custode-identita.tsx). Il cookie lo imposta
// SEMPRE il server: su iOS è l'unico storage esente dalla tagliola dei
// 7 giorni che Safari applica a tutto ciò che scrive JavaScript.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_IDENTITA = "identita";
const UN_ANNO_S = 60 * 60 * 24 * 365;

function segreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET non impostata");
  return s;
}

function firma(id: string): string {
  return createHmac("sha256", segreto()).update(id).digest("hex").slice(0, 32);
}

export function creaToken(id: string): string {
  return `${id}.${firma(id)}`;
}

/** Verifica un token e restituisce l'id, o null se malformato/manomesso. */
export function idDaToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const punto = token.indexOf(".");
  if (punto === -1) return null;
  const id = token.slice(0, punto);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const ricevuta = token.slice(punto + 1);
  const attesa = firma(id);
  if (ricevuta.length !== attesa.length) return null;
  return timingSafeEqual(Buffer.from(ricevuta), Buffer.from(attesa))
    ? id
    : null;
}

export async function leggiIdCorrente(): Promise<string | null> {
  return idDaToken((await cookies()).get(COOKIE_IDENTITA)?.value);
}

/** Imposta (o rinnova) il cookie. Solo da server action o route handler. */
export async function scriviIdentita(id: string): Promise<void> {
  (await cookies()).set(COOKIE_IDENTITA, creaToken(id), {
    maxAge: UN_ANNO_S,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // NON httpOnly: il client deve poterlo specchiare in localStorage
    // (custode-identita). La firma rende inutile manometterlo.
  });
}
