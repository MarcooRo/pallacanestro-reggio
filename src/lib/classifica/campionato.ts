// Classifica del campionato, letta al volo dalla fonte (come i video e
// i tabellini delle altre squadre): niente scritture, cache 30 minuti.
// La giornata da chiedere è l'ultima GIOCATA, che conosciamo dal nostro
// calendario; la Regular Season giusta è la più recente con gare finite.

import { and, desc, eq, isNotNull, max } from "drizzle-orm";

import { db } from "@/src/db";
import { clubs, competitions, matches, teamSeasons } from "@/src/db/schema";
import { getClassifica, type RigaClassifica } from "@/src/ingestion/sources/lba";

export interface ClassificaCampionato {
  competizione: string;
  seasonYear: number;
  giornata: string | null;
  righe: (RigaClassifica & { reggio: boolean })[];
}

export async function getClassificaCampionato(): Promise<ClassificaCampionato | null> {
  const regularSeasons = await db
    .select({
      id: competitions.id,
      lbaChampionshipId: competitions.lbaChampionshipId,
      name: competitions.name,
      seasonYear: competitions.seasonYear,
      ultimaGiornata: max(matches.daySerial),
    })
    .from(competitions)
    .leftJoin(
      matches,
      and(eq(matches.competitionId, competitions.id), eq(matches.status, "finished")),
    )
    .where(and(eq(competitions.typeCode, "RS"), isNotNull(competitions.lbaChampionshipId)))
    .groupBy(competitions.id, competitions.lbaChampionshipId, competitions.name, competitions.seasonYear)
    .orderBy(desc(competitions.seasonYear));

  for (const rs of regularSeasons) {
    if (!rs.ultimaGiornata) continue; // stagione non ancora iniziata

    // Ultima giocata, poi un passo indietro: la fonte pubblica la
    // classifica per giornata e quella corrente può tardare.
    const classifica =
      (await getClassifica(rs.lbaChampionshipId!, rs.ultimaGiornata, 1800)) ??
      (rs.ultimaGiornata > 1
        ? await getClassifica(rs.lbaChampionshipId!, rs.ultimaGiornata - 1, 1800)
        : null);
    if (!classifica) continue;

    // La riga di Reggio si riconosce dal lba_team_id, mai dal club_code
    const squadreReggio = await db
      .select({ lbaTeamId: teamSeasons.lbaTeamId })
      .from(teamSeasons)
      .innerJoin(clubs, eq(clubs.id, teamSeasons.clubId))
      .where(eq(clubs.isHomeClub, true));
    const idReggio = new Set(squadreReggio.map((r) => r.lbaTeamId));

    return {
      competizione: rs.name,
      seasonYear: rs.seasonYear,
      giornata: classifica.giornata,
      righe: classifica.righe.map((r) => ({
        ...r,
        reggio: idReggio.has(r.lbaTeamId),
      })),
    };
  }
  return null;
}
