// Involucro comune dei route handler cron: verifica del secret,
// esecuzione con log e risposta JSON. Gli handler restano una riga.

import { NextResponse, type NextRequest } from "next/server";

import { logIngestione } from "@/src/ingestion/sync";

// Il segreto atteso. trim() perché un valore incollato nella dashboard
// di Vercel può portarsi dietro uno spazio o un a-capo invisibili: senza
// questo il confronto fallisce e dall'esterno è indistinguibile da un
// segreto sbagliato.
function segretoAtteso(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || undefined;
}

// Vercel Cron manda "Authorization: Bearer {CRON_SECRET}"; per le prove
// manuali e per uno scheduler esterno va bene anche ?secret=.
function autorizzato(request: NextRequest): boolean {
  const secret = segretoAtteso();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim();
  if (header === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get("secret")?.trim() === secret;
}

export function handlerCron(
  target: string,
  esegui: () => Promise<unknown>,
) {
  return async function GET(request: NextRequest) {
    if (!autorizzato(request)) {
      // "configurato" dice se CRON_SECRET esiste nel runtime che ha
      // risposto: distingue "segreto sbagliato" da "variabile assente in
      // questo deployment", che dall'esterno danno lo stesso 401. Non
      // rivela nulla del valore.
      return NextResponse.json(
        { errore: "non autorizzato", configurato: Boolean(segretoAtteso()) },
        { status: 401 },
      );
    }

    try {
      const esito = await esegui();
      return NextResponse.json({ ok: true, target, esito });
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : String(err);
      await logIngestione("cron", target, { errore: messaggio });
      return NextResponse.json(
        { ok: false, target, errore: messaggio },
        { status: 500 },
      );
    }
  };
}
