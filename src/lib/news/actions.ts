"use server";

// Server actions degli articoli nostri. Il ruolo si verifica QUI, in ogni
// action: il client non decide niente. L'unica strada verso 'published' è
// pubblicaArticolo — il layer MCP per costruzione scrive solo bozze.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { news } from "@/src/db/schema";
import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataDaRoma } from "@/src/lib/date";
import {
  archiviaArticolo,
  ErroreArticolo,
  getArticolo,
} from "@/src/lib/news/redazione";

const uuid = z.string().uuid();

function esito(id: string, messaggio: string): never {
  // La lista, la pagina dell'articolo e le due pagine pubbliche che lo
  // mostrano: dopo un cambio di stato nessuna deve restare indietro.
  revalidatePath("/admin/news");
  revalidatePath(`/admin/news/${id}`);
  revalidatePath("/news");
  revalidatePath("/");
  redirect(`/admin/news/${id}?esito=${encodeURIComponent(messaggio)}`);
}

// Un id sbagliato non deve diventare una pagina di errore: torna nella
// lista col motivo scritto.
async function carica(id: string) {
  try {
    return await getArticolo(id);
  } catch (err) {
    revalidatePath("/admin/news");
    redirect(
      `/admin/news?esito=${encodeURIComponent(err instanceof ErroreArticolo ? err.message : "Articolo non trovato")}`,
    );
  }
}

// Manda l'articolo online. La data: vuota = adesso, altrimenti quella
// scelta (datetime-local, ora italiana) — utile per retrodatare un pezzo.
export async function pubblicaArticolo(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("id"));
  const quando = formData.get("publishedAt");

  const articolo = await carica(id);
  if (articolo.status === "published") {
    esito(id, "Era già pubblicato");
  }
  if (!articolo.body || articolo.body.length === 0) {
    esito(id, "L'articolo non ha corpo: niente da pubblicare");
  }

  await db
    .update(news)
    .set({
      status: "published",
      publishedAt:
        typeof quando === "string" && quando ? dataDaRoma(quando) : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(news.id, id));

  esito(id, "Pubblicato: è online in /news");
}

// Ritira dal sito senza archiviare: torna bozza, quindi l'AI può
// correggerlo con update_article e si ripubblica.
export async function riportaInBozza(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("id"));
  const articolo = await carica(id);
  if (articolo.status === "draft") esito(id, "Era già una bozza");

  await db
    .update(news)
    .set({ status: "draft", isPinned: false, updatedAt: new Date() })
    .where(eq(news.id, id));

  esito(id, "Ritirato dal sito: è tornato bozza");
}

export async function fissaInAlto(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("id"));
  const articolo = await carica(id);
  if (articolo.status !== "published") {
    esito(id, "Si fissa in alto solo un articolo pubblicato");
  }

  await db
    .update(news)
    .set({ isPinned: !articolo.isPinned, updatedAt: new Date() })
    .where(eq(news.id, id));

  esito(id, articolo.isPinned ? "Non è più in evidenza" : "Fissato in alto nelle news");
}

// Correzioni a mano di testata e sommario: il corpo lo scrive l'AI, ma
// titolo ed excerpt sono ciò che si legge nella lista e nelle condivisioni.
export async function correggiTestata(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const authorName = String(formData.get("authorName") ?? "").trim();
  if (!title) esito(id, "Il titolo non può restare vuoto");

  await db
    .update(news)
    .set({
      title,
      excerpt: excerpt || null,
      authorName: authorName || null,
      updatedAt: new Date(),
    })
    .where(eq(news.id, id));

  // Lo slug NON si tocca: un articolo già condiviso non cambia indirizzo.
  esito(id, "Testata aggiornata");
}

export async function archiviaArticoloAction(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("id"));
  await archiviaArticolo(id);
  esito(id, "Archiviato: fuori dal sito");
}
