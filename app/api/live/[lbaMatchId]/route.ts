// Punteggio e tabellino durante la partita, letti al volo dalla fonte.
// Non scrive niente nel database: la persistenza del tabellino resta al
// cron di fine gara (jobTabellini).
//
// La risposta è pubblica e cacheata per FINESTRA_SECONDI: mille tifosi
// collegati non fanno mille chiamate alla LBA, ne fanno una — la CDN
// serve a tutti la stessa copia e assorbe il resto.

import { NextResponse } from "next/server";

import { getTabellino } from "@/src/ingestion/sources/lba";
import { versoRigheTabellino } from "@/src/lib/partite/tabellino-live";

// Sotto i 15 secondi si aggiornerebbe solo il rumore: il tabellino
// ufficiale non cambia più in fretta di così.
const FINESTRA_SECONDI = 20;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lbaMatchId: string }> },
) {
  const lbaMatchId = Number((await params).lbaMatchId);
  if (!Number.isInteger(lbaMatchId) || lbaMatchId <= 0) {
    return NextResponse.json({ errore: "id non valido" }, { status: 400 });
  }

  try {
    const tabellino = await getTabellino(lbaMatchId, FINESTRA_SECONDI);
    return NextResponse.json(
      {
        status: tabellino.status,
        homeScore: tabellino.homeScore,
        awayScore: tabellino.awayScore,
        parziali: tabellino.parziali,
        righe: versoRigheTabellino(tabellino),
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${FINESTRA_SECONDI}, stale-while-revalidate=${FINESTRA_SECONDI * 2}`,
        },
      },
    );
  } catch (err) {
    // Fonte giù: il client tiene i dati che ha già e riprova più tardi.
    // Niente cache sugli errori, altrimenti il guasto durerebbe più del guasto.
    return NextResponse.json(
      { errore: err instanceof Error ? err.message : "fonte non disponibile" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
