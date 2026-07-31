// Apertura della finestra di voto e automatismi collegati.
// Condivisa tra la server action dell'admin e i cron: l'automatismo è
// una comodità, la via manuale resta sempre disponibile (regola 5).

import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { matches } from "@/src/db/schema";
import { inviaPushCategoria } from "@/src/lib/push/invia";
import { ORE_FINESTRA_DEFAULT } from "@/src/lib/voto/regole";

async function pushSicura(...args: Parameters<typeof inviaPushCategoria>) {
  try {
    await inviaPushCategoria(...args);
  } catch (err) {
    console.warn("Invio push fallito:", err);
  }
}

export async function apriFinestraVoto(
  matchId: string,
  ore = ORE_FINESTRA_DEFAULT,
): Promise<{ ok: boolean; motivo?: string }> {
  const partita = await db.query.matches.findFirst({
    columns: { id: true, votingState: true },
    where: (m, { eq }) => eq(m.id, matchId),
  });
  if (!partita) return { ok: false, motivo: "Partita non trovata" };
  if (partita.votingState !== "closed") {
    return { ok: false, motivo: "La votazione è già stata aperta per questa partita" };
  }

  // Senza votabili la scheda sarebbe vuota: partita di altre squadre
  // o roster non ancora seedato.
  const [conteggio] = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from eligible_voters(${matchId})`,
  );
  if (conteggio.n === 0) {
    return {
      ok: false,
      motivo:
        "Nessun giocatore votabile: il club di casa non gioca questa partita o il roster manca",
    };
  }

  const adesso = new Date();
  await db
    .update(matches)
    .set({
      votingState: "open",
      votingOpensAt: adesso,
      votingClosesAt: new Date(adesso.getTime() + ore * 3_600_000),
    })
    .where(eq(matches.id, matchId));

  const dettagli = await db.execute<{ casa: string; ospite: string }>(sql`
    select cas.display_name as casa, osp.display_name as ospite
    from matches m
    join team_seasons cas on cas.id = m.home_team_season_id
    join team_seasons osp on osp.id = m.away_team_season_id
    where m.id = ${matchId}`);
  await pushSicura("vote_open", {
    title: "Fine partita. Vota il migliore.",
    body: dettagli[0] ? `${dettagli[0].casa} – ${dettagli[0].ospite}` : "",
    url: `/partite/${matchId}`,
  });

  return { ok: true };
}

// Cron: apre la finestra sulle partite del club di casa appena finite
// che non hanno mai avuto una votazione. La finestra guarda solo le
// ultime 72 ore: le gare vecchie non si aprono retroattivamente da sole.
export async function apriVotazioniAutomatiche(): Promise<string[]> {
  const candidate = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, "finished"),
        eq(matches.votingState, "closed"),
        isNull(matches.votingOpensAt),
        gt(matches.startsAt, sql`now() - interval '72 hours'`),
        sql`exists (
          select 1 from team_seasons ts
          join clubs c on c.id = ts.club_id and c.is_home_club
          where ts.id in (${matches.homeTeamSeasonId}, ${matches.awayTeamSeasonId})
        )`,
      ),
    );

  const aperte: string[] = [];
  for (const { id } of candidate) {
    const esito = await apriFinestraVoto(id);
    if (esito.ok) aperte.push(id);
  }
  return aperte;
}

// Cron: push "ultime ore per votare" alle votazioni che chiudono entro
// 2 ore, una sola volta per partita (vote_closing_notified_at).
export async function promemoriaChiusura(): Promise<number> {
  const daAvvisare = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.votingState, "open"),
        isNull(matches.voteClosingNotifiedAt),
        gt(matches.votingClosesAt, sql`now()`),
        lt(matches.votingClosesAt, sql`now() + interval '2 hours'`),
      ),
    );

  for (const { id } of daAvvisare) {
    // il flag si alza PRIMA dell'invio: meglio una push persa che doppia
    await db
      .update(matches)
      .set({ voteClosingNotifiedAt: new Date() })
      .where(eq(matches.id, id));
    await pushSicura("vote_closing", {
      title: "Ultime ore per votare.",
      body: "La votazione chiude a breve: di' la tua sul migliore in campo.",
      url: `/partite/${id}`,
    });
  }
  return daAvvisare.length;
}
