// I job dei cron: funzioni pure di orchestrazione, ognuna con il proprio
// log in ingestion_runs (con diff, regola 4). I route handler le espongono.

import { revalidatePath } from "next/cache";

import { aggiornaNews } from "@/src/ingestion/news";
import {
  logIngestione,
  sincronizzaAnagrafiche,
  sincronizzaCalendarioBcl,
  sincronizzaCalendarioCorrente,
  sincronizzaTabellini,
} from "@/src/ingestion/sync";
import { pubblicaCoda } from "@/src/lib/social/publisher";
import {
  apriVotazioniAutomatiche,
  promemoriaChiusura,
} from "@/src/lib/voto/finestra";

function homeClubLbaId(): number {
  const id = Number(process.env.HOME_CLUB_LBA_ID);
  if (!id) throw new Error("HOME_CLUB_LBA_ID non impostata");
  return id;
}

function revalidaTutto() {
  for (const path of ["/", "/calendario", "/classifiche", "/giocatori", "/news"]) {
    revalidatePath(path);
  }
  revalidatePath("/partite/[id]", "page");
}

export async function jobCalendario() {
  const diffs = await sincronizzaCalendarioCorrente();

  // La coppa europea viaggia sulla sua fonte: un fallimento FIBA non
  // deve toccare il sync del campionato (last-known-good anche qui).
  let bcl = null;
  try {
    bcl = await sincronizzaCalendarioBcl();
    if (bcl) {
      await logIngestione("bcl", "calendar", {
        seen: bcl.totali,
        changed: bcl.nuove + bcl.cambiate,
        diff: bcl,
      });
    }
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    console.warn("Calendario BCL non disponibile:", messaggio);
    await logIngestione("bcl", "calendar", { errore: messaggio });
  }

  // Automatismo apertura voto (comodità, non dipendenza: regola 5).
  const votazioniAperte = await apriVotazioniAutomatiche();

  await logIngestione("lba", "calendar", {
    seen: diffs.reduce((n, d) => n + d.totali, 0),
    changed: diffs.reduce((n, d) => n + d.nuove + d.cambiate, 0),
    diff: { competizioni: diffs, votazioniAperte },
  });

  revalidaTutto();
  return { competizioni: diffs, bcl, votazioniAperte };
}

export async function jobTabellini(limite = 10) {
  const diff = await sincronizzaTabellini(limite);
  await logIngestione("lba", "boxscore", {
    seen: diff.candidate,
    changed: diff.sincronizzate,
    diff,
    status: diff.partiteFallite.length > 0 ? "partial" : "ok",
  });
  if (diff.sincronizzate > 0) revalidaTutto();
  return diff;
}

export async function jobAnagrafiche() {
  const esito = await sincronizzaAnagrafiche(homeClubLbaId());
  await logIngestione("lba", "roster", {
    seen: esito.squadre + esito.giocatori,
    diff: esito,
  });
  revalidaTutto();
  return esito;
}

export async function jobNews() {
  // aggiornaNews logga già per fonte in ingestion_runs
  const esito = await aggiornaNews();
  if (esito.nuoveLba + esito.nuoveWordPress > 0) {
    revalidatePath("/news");
    revalidatePath("/");
  }
  return esito;
}

// La coda social: pubblica su Meta i post approved arrivati alla loro
// ora. Corsa frequente (ogni pochi minuti): quasi sempre a vuoto, e a
// vuoto non logga — ingestion_runs non è un heartbeat.
export async function jobSocial() {
  const esito = await pubblicaCoda();
  if (esito.pubblicati.length > 0 || esito.falliti.length > 0) {
    await logIngestione("meta", "social", {
      seen: esito.pubblicati.length + esito.falliti.length,
      changed: esito.pubblicati.length,
      diff: esito,
      status: esito.falliti.length > 0 ? "partial" : "ok",
    });
    revalidatePath("/admin/social");
  }
  return esito;
}

export async function jobPromemoria() {
  const avvisate = await promemoriaChiusura();
  return { avvisate };
}

// Orchestratore per il piano Hobby di Vercel (un solo cron giornaliero):
// esegue tutto in sequenza; le anagrafiche solo il lunedì.
export async function jobGiornaliero() {
  const calendario = await jobCalendario();
  const tabellini = await jobTabellini(20);
  const news = await jobNews();
  const promemoria = await jobPromemoria();
  const anagrafiche =
    new Date().getUTCDay() === 1 ? await jobAnagrafiche() : "salta (non è lunedì)";

  return { calendario, tabellini, news, promemoria, anagrafiche };
}
