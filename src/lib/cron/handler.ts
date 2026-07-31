// Involucro comune dei route handler cron: verifica del secret,
// esecuzione con log e risposta JSON. Gli handler restano una riga.

import { NextResponse, type NextRequest } from "next/server";

import { logIngestione } from "@/src/ingestion/sync";

// Vercel Cron manda "Authorization: Bearer {CRON_SECRET}"; per le prove
// manuali e per uno scheduler esterno va bene anche ?secret=.
function autorizzato(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get("secret") === secret;
}

export function handlerCron(
  target: string,
  esegui: () => Promise<unknown>,
) {
  return async function GET(request: NextRequest) {
    if (!autorizzato(request)) {
      return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
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
