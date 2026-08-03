"use server";

// Server actions del pannello admin. Il ruolo si verifica QUI, in ogni
// action (mai in proxy.ts): il proxy fa solo refresh della sessione.

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import {
  appSettings,
  matches,
  players,
  pointsLedger,
  predictionAnswers,
  predictions,
  voteTallies,
} from "@/src/db/schema";
import { aggiornaNews } from "@/src/ingestion/news";
import { getProfilo } from "@/src/lib/auth/session";
import { CHIAVE_FLAG, CHIAVI_FLAG, type Flag } from "@/src/lib/flag";
import {
  leggiOpzioni,
  leggiScelta,
  MAX_LUNGHEZZA_DOMANDA,
  puntiVisionario,
  scelta,
  validaOpzioni,
} from "@/src/lib/pronostici/regole";
import { inviaPushCategoria } from "@/src/lib/push/invia";
import { apriFinestraVoto } from "@/src/lib/voto/finestra";
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

  // Stessa logica del cron (src/lib/voto/finestra.ts): controlli,
  // apertura e push vivono in un punto solo.
  const esito = await apriFinestraVoto(matchId, ore);
  if (!esito.ok) esitoAdmin(esito.motivo!);

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

// ---- Interruttori delle funzionalità ----

export async function salvaFlag(formData: FormData) {
  await richiediAdmin();

  // Le checkbox non spedite sono spente: si riscrive l'oggetto intero,
  // così una chiave nuova nel codice non resta appesa a un valore vecchio.
  const accesi = new Set(formData.getAll("flag").map(String));
  const valore = Object.fromEntries(
    CHIAVI_FLAG.map((chiave) => [chiave, accesi.has(chiave)]),
  ) as unknown as Flag;

  await db
    .insert(appSettings)
    .values({ key: CHIAVE_FLAG, value: valore })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: valore, updatedAt: new Date() },
    });

  // I flag decidono cosa si vede in mezza app: si invalida tutto.
  revalidatePath("/", "layout");
  esitoAdmin("Funzionalità aggiornate");
}

// ---- Pronostici ----
//
// Le domande sono libere e diverse ogni giornata, quindi le scrive l'admin e
// le risolve a mano. Le opzioni NON si modificano dopo la creazione: le
// risposte sono salvate come indice, cambiarle falserebbe i conteggi.

export async function creaPronostico(formData: FormData) {
  await richiediAdmin();

  const matchId = uuid.parse(formData.get("matchId"));
  const domanda = z
    .string()
    .trim()
    .min(3, "La domanda è troppo corta")
    .max(MAX_LUNGHEZZA_DOMANDA)
    .safeParse(formData.get("question"));
  if (!domanda.success) esitoAdmin("Domanda non valida");

  // Una risposta per riga: è il modo più veloce di scriverne quattro.
  const esitoOpzioni = validaOpzioni(String(formData.get("options") ?? "").split("\n"));
  if ("errore" in esitoOpzioni) esitoAdmin(esitoOpzioni.errore);

  const partita = await db.query.matches.findFirst({
    columns: { id: true, startsAt: true },
    where: (m, { eq }) => eq(m.id, matchId),
  });
  if (!partita) esitoAdmin("Partita non trovata");

  // Chiusura alla palla a due, salvo diversa indicazione.
  const chiusuraScelta = z.coerce
    .date()
    .safeParse(formData.get("closesAt") || undefined);
  const closesAt = chiusuraScelta.success ? chiusuraScelta.data : partita.startsAt;

  await db.insert(predictions).values({
    matchId,
    question: domanda.data,
    // 'open' nel senso del vocabolario dello schema: domanda creativa,
    // risoluzione manuale. Non è lo stato del pronostico.
    kind: "open",
    options: esitoOpzioni.opzioni,
    autoResolvable: false,
    closesAt,
    status: "open",
  });

  revalidaPartita(matchId);
  esitoAdmin(`Pronostico aperto (${esitoOpzioni.opzioni.length} risposte)`);
}

export async function chiudiPronostico(formData: FormData) {
  await richiediAdmin();
  const predictionId = uuid.parse(formData.get("predictionId"));

  const [aggiornato] = await db
    .update(predictions)
    .set({ status: "closed" })
    .where(and(eq(predictions.id, predictionId), eq(predictions.status, "open")))
    .returning({ matchId: predictions.matchId });
  if (!aggiornato) esitoAdmin("Il pronostico non era aperto");

  revalidaPartita(aggiornato.matchId);
  esitoAdmin("Pronostico chiuso alle risposte");
}

export async function risolviPronostico(formData: FormData) {
  await richiediAdmin();

  const predictionId = uuid.parse(formData.get("predictionId"));
  const opzione = z.coerce.number().int().min(0).parse(formData.get("opzione"));

  const pronostico = await db.query.predictions.findFirst({
    columns: { id: true, matchId: true, options: true },
    where: (p, { eq }) => eq(p.id, predictionId),
  });
  if (!pronostico) esitoAdmin("Pronostico non trovato");
  if (opzione >= leggiOpzioni(pronostico.options).length) {
    esitoAdmin("Quella risposta non esiste");
  }

  const risposte = await db
    .select({
      userId: predictionAnswers.userId,
      answer: predictionAnswers.answer,
    })
    .from(predictionAnswers)
    .where(eq(predictionAnswers.predictionId, pronostico.id));

  const azzeccate = risposte.filter((r) => leggiScelta(r.answer) === opzione);
  const punti = puntiVisionario(azzeccate.length, risposte.length);

  await db.transaction(async (tx) => {
    // Idempotente: risolvere di nuovo (o correggere la risposta giusta)
    // ricalcola tutto da zero invece di sommarsi al giro precedente.
    await tx
      .delete(pointsLedger)
      .where(
        and(
          eq(pointsLedger.reason, "prediction_correct"),
          eq(pointsLedger.refId, pronostico.id),
        ),
      );
    await tx
      .update(predictionAnswers)
      .set({ isCorrect: false })
      .where(eq(predictionAnswers.predictionId, pronostico.id));

    if (azzeccate.length > 0) {
      const vincenti = azzeccate.map((r) => r.userId);
      await tx
        .update(predictionAnswers)
        .set({ isCorrect: true })
        .where(
          and(
            eq(predictionAnswers.predictionId, pronostico.id),
            inArray(predictionAnswers.userId, vincenti),
          ),
        );
      await tx.insert(pointsLedger).values(
        vincenti.map((userId) => ({
          userId,
          reason: "prediction_correct" as const,
          refId: pronostico.id,
          points: punti,
        })),
      );
    }

    await tx
      .update(predictions)
      .set({ status: "resolved", correctAnswer: scelta(opzione) })
      .where(eq(predictions.id, pronostico.id));
  });

  revalidaPartita(pronostico.matchId);
  esitoAdmin(
    azzeccate.length > 0
      ? `Risolto: ${azzeccate.length} su ${risposte.length} hanno indovinato, ${punti} punti a testa`
      : `Risolto: nessuno ha indovinato (${risposte.length} risposte)`,
  );
}

// Domanda sbagliata o gara rinviata: si annulla e i punti tornano indietro.
export async function annullaPronostico(formData: FormData) {
  await richiediAdmin();
  const predictionId = uuid.parse(formData.get("predictionId"));

  const pronostico = await db.query.predictions.findFirst({
    columns: { id: true, matchId: true },
    where: (p, { eq }) => eq(p.id, predictionId),
  });
  if (!pronostico) esitoAdmin("Pronostico non trovato");

  await db.transaction(async (tx) => {
    await tx
      .delete(pointsLedger)
      .where(
        and(
          eq(pointsLedger.reason, "prediction_correct"),
          eq(pointsLedger.refId, pronostico.id),
        ),
      );
    await tx
      .update(predictionAnswers)
      .set({ isCorrect: null })
      .where(eq(predictionAnswers.predictionId, pronostico.id));
    await tx
      .update(predictions)
      .set({ status: "voided", correctAnswer: null })
      .where(eq(predictions.id, pronostico.id));
  });

  revalidaPartita(pronostico.matchId);
  esitoAdmin("Pronostico annullato, punti revocati");
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
