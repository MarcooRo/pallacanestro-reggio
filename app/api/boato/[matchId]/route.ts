// L'onda del boato, letta dalla tifoseria durante la gara.
//
// Perché una rotta e non una server action: qui il costo cresce col numero
// di spettatori, e la risposta è la stessa per tutti. Cacheata per pochi
// secondi sulla CDN, mille tifosi collegati fanno una query, non mille.
// La scrittura dei tap resta in una server action (src/lib/boato/actions.ts).

import { NextResponse } from "next/server";
import { z } from "zod";

import { getBoato } from "@/src/lib/boato/queries";

// Metà del bucket: aggiornare più spesso mostrerebbe lo stesso disegno.
const FINESTRA_SECONDI = 5;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const matchId = z.string().uuid().safeParse((await params).matchId);
  if (!matchId.success) {
    return NextResponse.json({ errore: "id non valido" }, { status: 400 });
  }

  try {
    const dati = await getBoato(matchId.data);
    return NextResponse.json(dati, {
      headers: {
        "Cache-Control": `public, s-maxage=${FINESTRA_SECONDI}, stale-while-revalidate=${FINESTRA_SECONDI * 2}`,
      },
    });
  } catch (err) {
    // Database in difficoltà: il client tiene l'onda che ha già.
    return NextResponse.json(
      { errore: err instanceof Error ? err.message : "lettura non disponibile" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
