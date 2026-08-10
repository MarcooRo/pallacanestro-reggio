"use server";

// Server actions della coda social. Il ruolo si verifica QUI, in ogni
// action: il client non decide niente. L'unica strada verso 'approved'
// è approvaPost — l'MCP per costruzione scrive solo draft e archived.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import { getProfilo } from "@/src/lib/auth/session";
import { dataDaRoma } from "@/src/lib/date";
import { renderizzaPost } from "@/src/lib/social/render";

const uuid = z.string().uuid();

async function richiediAdmin() {
  const profilo = await getProfilo();
  if (!profilo || profilo.role !== "admin") redirect("/");
}

function esito(postId: string, messaggio: string): never {
  revalidatePath("/admin/social");
  revalidatePath(`/admin/social/${postId}`);
  redirect(`/admin/social/${postId}?esito=${encodeURIComponent(messaggio)}`);
}

async function statoCorrente(postId: string): Promise<string | null> {
  const [post] = await db
    .select({ status: socialPosts.status })
    .from(socialPosts)
    .where(eq(socialPosts.id, postId))
    .limit(1);
  return post?.status ?? null;
}

// Approva, con data programmata facoltativa (datetime-local, ora italiana).
// Prima di approvare renderizza i media mancanti: un post approvato deve
// essere pubblicabile così com'è.
export async function approvaPost(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));
  const quando = formData.get("scheduledAt");

  const stato = await statoCorrente(postId);
  if (stato !== "draft") {
    esito(postId, `Solo una bozza si può approvare (stato attuale: ${stato})`);
  }

  const media = await db
    .select({ renderedUrl: socialMediaItems.renderedUrl })
    .from(socialMediaItems)
    .where(eq(socialMediaItems.postId, postId));
  if (media.length === 0) esito(postId, "Il post non ha immagini: niente da approvare");
  if (media.some((m) => !m.renderedUrl)) await renderizzaPost(postId);

  await db
    .update(socialPosts)
    .set({
      status: "approved",
      scheduledAt:
        typeof quando === "string" && quando ? dataDaRoma(quando) : null,
      updatedAt: new Date(),
    })
    .where(eq(socialPosts.id, postId));

  esito(
    postId,
    typeof quando === "string" && quando
      ? "Approvato e programmato"
      : "Approvato: si pubblica alla prossima corsa (fase 2)",
  );
}

export async function modificaPost(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));

  const stato = await statoCorrente(postId);
  if (stato !== "draft") {
    esito(postId, `Si modifica solo una bozza (stato attuale: ${stato})`);
  }

  const caption = String(formData.get("caption") ?? "");
  const hashtags = String(formData.get("hashtags") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));

  await db
    .update(socialPosts)
    .set({ caption, hashtags, updatedAt: new Date() })
    .where(eq(socialPosts.id, postId));

  esito(postId, "Caption e hashtag aggiornati");
}

export async function rigeneraImmagini(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));
  try {
    await renderizzaPost(postId);
  } catch (err) {
    esito(postId, `Render fallito: ${err instanceof Error ? err.message : err}`);
  }
  esito(postId, "Immagini rigenerate");
}

export async function archiviaPost(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));
  await db
    .update(socialPosts)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(socialPosts.id, postId));
  esito(postId, "Archiviato");
}
