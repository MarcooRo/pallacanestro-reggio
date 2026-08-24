// La firma degli URL di upload: sostituisce i "signed upload URL" di
// Supabase. Il token è l'HMAC dell'id dell'asset (chiave AUTH_SECRET):
// chi lo possiede può caricare il file di QUEL solo asset pending.

import { createHmac, timingSafeEqual } from "node:crypto";

function segreto(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET non impostata");
  return s;
}

export function firmaUpload(assetId: string): string {
  return createHmac("sha256", segreto())
    .update(`upload.${assetId}`)
    .digest("hex")
    .slice(0, 40);
}

export function verificaFirmaUpload(
  assetId: string,
  token: string | null,
): boolean {
  if (!token) return false;
  const attesa = firmaUpload(assetId);
  return (
    token.length === attesa.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(attesa))
  );
}
