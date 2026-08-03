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

// Senza `seasonYear` si prende la stagione più recente che abbia dati:
// con l'anno, invece, si resta su quello (mai ricadere di nascosto su
// un'altra stagione, cfr. la CTA del calendario).
export async function getClassificaCampionato(
  seasonYear?: number,
): Promise<ClassificaCampionato | null> {
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
    .where(
      and(
        eq(competitions.typeCode, "RS"),
        isNotNull(competitions.lbaChampionshipId),
        seasonYear !== undefined
          ? eq(competitions.seasonYear, seasonYear)
          : undefined,
      ),
    )
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

// Solo DB, nessuna chiamata alla fonte: serve una Regular Season agganciata
// alla fonte e almeno una gara giocata. Chi mostra un rimando alla
// classifica di una stagione lo chiede prima di renderlo.
export async function stagioneHaClassifica(seasonYear: number): Promise<boolean> {
  const righe = await db
    .select({ id: competitions.id })
    .from(competitions)
    .innerJoin(
      matches,
      and(eq(matches.competitionId, competitions.id), eq(matches.status, "finished")),
    )
    .where(
      and(
        eq(competitions.typeCode, "RS"),
        eq(competitions.seasonYear, seasonYear),
        isNotNull(competitions.lbaChampionshipId),
      ),
    )
    .limit(1);
  return righe.length > 0;
}
