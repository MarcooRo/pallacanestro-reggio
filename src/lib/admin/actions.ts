"use server";

// Server actions del pannello admin. Il ruolo si verifica QUI, in ogni
// action (mai in proxy.ts): il proxy fa solo refresh della sessione.

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { matches, players, voteTallies } from "@/src/db/schema";
import { aggiornaNews } from "@/src/ingestion/news";
import { getProfilo } from "@/src/lib/auth/session";
import { getPartita } from "@/src/lib/partite/queries";
import { inviaPushCategoria } from "@/src/lib/push/invia";
import { ORE_FINESTRA_DEFAULT } from "@/src/lib/voto/regole";
import { calcolaTally } from "@/src/lib/voto/tally";

// L'invio push non deve mai far fallire l'azione che lo innesca.
async function pushSicura(...args: Parameters<typeof inviaPushCategoria>) {
  try {
    await inviaPushCategoria(...args);
  } catch (err) {
    console.warn("Invio push fallito:", err);
  }
}

async function richiediAdmin() {
  const profilo = await getProfilo();
  if (!profilo || profilo.role !== "admin") redirect("/");
  return profilo;
}

function esitoAdmin(messaggio: string): never {
  redirect(`/admin?esito=${encodeURIComponent(messaggio)}`);
}

const uuid = z.string().uuid();

// Aggiorna tutte le pagine che mostrano stato voto o risultati.
function revalidaPartita(matchId: string) {
  revalidatePath(`/partite/${matchId}`);
  revalidatePath("/calendario");
  revalidatePath("/classifiche");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function apriVotazione(formData: FormData) {
  await richiediAdmin();

  const matchId = uuid.parse(formData.get("matchId"));
  const ore = z.coerce
    .number()
    .int()
    .min(1)
    .max(96)
    .catch(ORE_FINESTRA_DEFAULT)
    .parse(formData.get("ore"));

  const partita = await db.query.matches.findFirst({
    columns: { id: true, votingState: true },
    where: (m, { eq }) => eq(m.id, matchId),
  });
  if (!partita) esitoAdmin("Partita non trovata");
  if (partita.votingState !== "closed") {
    esitoAdmin("La votazione è già stata aperta per questa partita");
  }

  // Senza votabili la scheda sarebbe vuota: partita di altre squadre
  // o roster non ancora seedato.
  const [conteggio] = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from eligible_voters(${matchId})`,
  );
  if (conteggio.n === 0) {
    esitoAdmin("Nessun giocatore votabile: il club di casa non gioca questa partita o il roster manca");
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

  const dettagli = await getPartita(matchId);
  await pushSicura("vote_open", {
    title: "Fine partita. Vota il migliore.",
    body: dettagli ? `${dettagli.homeTeam} – ${dettagli.awayTeam}` : "",
    url: `/partite/${matchId}`,
  });

  revalidaPartita(matchId);
  esitoAdmin(`Votazione aperta per ${ore} ore`);
}

export async function chiudiEPubblicaPagella(formData: FormData) {
  await richiediAdmin();
  const matchId = uuid.parse(formData.get("matchId"));

  const partita = await db.query.matches.findFirst({
    columns: { id: true, votingState: true },
    where: (m, { eq }) => eq(m.id, matchId),
  });
  if (!partita) esitoAdmin("Partita non trovata");
  if (partita.votingState !== "open") {
    esitoAdmin("La votazione non è aperta: niente da chiudere");
  }

  const votiEspressi = await db.query.votes.findMany({
    columns: {
      bestPlayerId: true,
      optionalAId: true,
      optionalBId: true,
      favoritePlayerId: true,
    },
    where: (v, { eq }) => eq(v.matchId, matchId),
  });

  const tally = calcolaTally(votiEspressi);

  await db.transaction(async (tx) => {
    // Idempotente: una richiusura ricalcola da zero.
    await tx.delete(voteTallies).where(eq(voteTallies.matchId, matchId));
    if (tally.length > 0) {
      await tx.insert(voteTallies).values(
        tally.map((r) => ({
          matchId,
          playerId: r.playerId,
          bestCount: r.bestCount,
          supportCount: r.supportCount,
          performancePoints: r.performancePoints,
          favoriteCount: r.favoriteCount,
        })),
      );
    }
    await tx
      .update(matches)
      .set({ votingState: "tallied" })
      .where(eq(matches.id, matchId));
  });

  if (tally.length > 0) {
    const [migliore] = await db
      .select({ firstName: players.firstName, lastName: players.lastName })
      .from(players)
      .where(eq(players.id, tally[0].playerId))
      .limit(1);
    await pushSicura("tally_published", {
      title: `Il migliore secondo la curva è ${migliore.firstName} ${migliore.lastName}`,
      body: "La pagella è pubblicata: guarda com'è andata.",
      url: `/partite/${matchId}`,
    });
  }

  revalidaPartita(matchId);
  esitoAdmin(
    tally.length > 0
      ? `Pagella pubblicata (${votiEspressi.length} voti)`
      : "Votazione chiusa senza voti: pagella vuota",
  );
}

export async function aggiornaPartita(formData: FormData) {
  await richiediAdmin();

  // Attenzione: z.coerce trasformerebbe null/"" in 0 — un campo punteggio
  // lasciato vuoto deve restare null, non diventare 0.
  const punteggio = z.preprocess(
    (v) => (v === null || v === "" ? null : Number(v)),
    z.number().int().min(0).nullable(),
  );
  const schema = z.object({
    matchId: uuid,
    homeScore: punteggio,
    awayScore: punteggio,
    status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]),
  });
  const dati = schema.parse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore") || null,
    awayScore: formData.get("awayScore") || null,
    status: formData.get("status"),
  });

  await db
    .update(matches)
    .set({
      homeScore: dati.homeScore,
      awayScore: dati.awayScore,
      status: dati.status,
      // Da qui in poi l'ingestion non tocca più questa riga (regola 2).
      manualOverride: true,
    })
    .where(eq(matches.id, dati.matchId));

  revalidaPartita(dati.matchId);
  esitoAdmin("Partita aggiornata (manual override attivo)");
}

// Fase 3: aggiornamento manuale delle news. Ciò che in Fase 4 farà il
// cron, l'admin lo può fare a mano da subito.
export async function aggiornaNewsAction() {
  await richiediAdmin();

  const esito = await aggiornaNews();
  revalidatePath("/news");
  revalidatePath("/");

  const parti = [
    `LBA: +${esito.nuoveLba}`,
    `Società: +${esito.nuoveWordPress}`,
    ...esito.errori,
  ];
  esitoAdmin(`News aggiornate — ${parti.join(" · ")}`);
}
