// I job dei cron: funzioni pure di orchestrazione, ognuna con il proprio
// log in ingestion_runs (con diff, regola 4). I route handler le espongono.

import { revalidatePath } from "next/cache";

import { aggiornaNews } from "@/src/ingestion/news";
import {
  logIngestione,
  sincronizzaAnagrafiche,
  sincronizzaCalendarioCorrente,
  sincronizzaTabellini,
} from "@/src/ingestion/sync";
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
  // Automatismo apertura voto (comodità, non dipendenza: regola 5).
  const votazioniAperte = await apriVotazioniAutomatiche();

  await logIngestione("lba", "calendar", {
    seen: diffs.reduce((n, d) => n + d.totali, 0),
    changed: diffs.reduce((n, d) => n + d.nuove + d.cambiate, 0),
    diff: { competizioni: diffs, votazioniAperte },
  });

  revalidaTutto();
  return { competizioni: diffs, votazioniAperte };
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
