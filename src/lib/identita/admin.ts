// L'admin è l'unico che fa login: una password sola, hash scrypt in
// app_settings (chiave "admin_password_hash", si imposta con
// scripts/imposta-password.ts), sessione in un cookie firmato httpOnly.
// Nessun legame coi profili: l'admin è un ruolo della macchina, non un tifoso.

import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/src/db";
import { appSettings } from "@/src/db/schema";
import { CHIAVE_HASH_ADMIN } from "@/src/lib/identita/password";

export const COOKIE_ADMIN = "admin_sessione";
const DURATA_SESSIONE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

export async function leggiHashAdmin(): Promise<string | null> {
  const [riga] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, CHIAVE_HASH_ADMIN))
    .limit(1);
  return typeof riga?.value === "string" ? riga.value : null;
}

function segreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET non impostata");
  return s;
}

function firmaScadenza(scade: number): string {
  return createHmac("sha256", segreto())
    .update(`admin.${scade}`)
    .digest("hex")
    .slice(0, 32);
}

export async function apriSessioneAdmin(): Promise<void> {
  const scade = Date.now() + DURATA_SESSIONE_MS;
  (await cookies()).set(COOKIE_ADMIN, `${scade}.${firmaScadenza(scade)}`, {
    maxAge: DURATA_SESSIONE_MS / 1000,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function chiudiSessioneAdmin(): Promise<void> {
  (await cookies()).delete(COOKIE_ADMIN);
}

export const isAdmin = cache(async (): Promise<boolean> => {
  const valore = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!valore) return false;
  const punto = valore.indexOf(".");
  if (punto === -1) return false;
  const scade = Number(valore.slice(0, punto));
  if (!Number.isFinite(scade) || scade < Date.now()) return false;
  const ricevuta = valore.slice(punto + 1);
  const attesa = firmaScadenza(scade);
  return (
    ricevuta.length === attesa.length &&
    timingSafeEqual(Buffer.from(ricevuta), Buffer.from(attesa))
  );
});

/** Da usare in testa a ogni pagina e server action del pannello. */
export async function richiediAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/accesso");
}
