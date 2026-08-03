// Letture di "Io ci sono". Esce il conteggio (aggregato) e la dichiarazione
// di chi sta guardando: chi ha detto di esserci non è mai un elenco.

import { and, count, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { attendances } from "@/src/db/schema";

export interface StatoPresenza {
  quanti: number;
  ciSono: boolean;
}

export async function getStatoPresenza(
  matchId: string,
  userId: string | null,
): Promise<StatoPresenza> {
  const [[riga], mia] = await Promise.all([
    db
      .select({ quanti: count() })
      .from(attendances)
      .where(eq(attendances.matchId, matchId)),
    userId
      ? db
          .select({ userId: attendances.userId })
          .from(attendances)
          .where(
            and(eq(attendances.matchId, matchId), eq(attendances.userId, userId)),
          )
          .limit(1)
      : [],
  ]);

  return { quanti: Number(riga?.quanti ?? 0), ciSono: mia.length > 0 };
}
