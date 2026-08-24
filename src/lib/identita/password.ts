// Hash e verifica della password admin: modulo puro (solo node:crypto),
// importabile anche dagli script bun fuori da Next.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const CHIAVE_HASH_ADMIN = "admin_password_hash";

// Formato salvato: "scrypt$<sale hex>$<hash hex>"
export function hashPassword(password: string): string {
  const sale = randomBytes(16).toString("hex");
  const hash = scryptSync(password, sale, 64).toString("hex");
  return `scrypt$${sale}$${hash}`;
}

export function verificaPassword(password: string, salvato: string): boolean {
  const [schema, sale, hash] = salvato.split("$");
  if (schema !== "scrypt" || !sale || !hash) return false;
  const calcolato = scryptSync(password, sale, 64);
  const atteso = Buffer.from(hash, "hex");
  return (
    calcolato.length === atteso.length && timingSafeEqual(calcolato, atteso)
  );
}
