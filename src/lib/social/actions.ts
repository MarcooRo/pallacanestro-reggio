"use server";

// Server actions della coda social. Il ruolo si verifica QUI, in ogni
// action: il client non decide niente. L'unica strada verso 'approved'
// è approvaPost — l'MCP per costruzione scrive solo draft e archived.

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataDaRoma } from "@/src/lib/date";
import { caricaAsset } from "@/src/lib/media/libreria";
import { eliminaPost } from "@/src/lib/social/elimina";
import { fuoriProporzioni } from "@/src/lib/social/forme";
import { renderizzaPost } from "@/src/lib/social/render";

const uuid = z.string().uuid();

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
      : "Approvato: si pubblica alla prossima corsa del cron",
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

// La scappatoia quando la grafica da template non convince: si carica
// una foto e prende il posto della slide, come asset nudo. La foto entra
// in libreria (source admin) come qualunque altra, così resta ritrovabile
// e l'AI può riusarla.
export async function sostituisciSlideConFoto(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));
  const itemId = uuid.parse(formData.get("itemId"));

  const stato = await statoCorrente(postId);
  if (stato !== "draft") {
    esito(postId, `Si modifica solo una bozza (stato attuale: ${stato})`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    esito(postId, "Nessun file selezionato");
  }

  let asset;
  try {
    asset = await caricaAsset(Buffer.from(await file.arrayBuffer()), {
      source: "admin",
    });
  } catch (err) {
    esito(postId, `Upload non riuscito — ${err instanceof Error ? err.message : err}`);
  }
  if (!asset.width || !asset.height) {
    esito(postId, "Upload riuscito ma senza dimensioni leggibili: foto non usabile");
  }

  // Stesse regole dell'asset nudo via MCP: proporzioni fuori dai limiti
  // Instagram = si riquadra a 1080×1350 (lo fa il render).
  const riquadrato = fuoriProporzioni(asset.width, asset.height);
  const aggiornate = await db
    .update(socialMediaItems)
    .set({
      kind: "asset",
      assetId: asset.id,
      template: null,
      params: null,
      width: riquadrato ? 1080 : asset.width,
      height: riquadrato ? 1350 : asset.height,
      renderedUrl: null,
      renderedAt: null,
    })
    .where(
      and(eq(socialMediaItems.id, itemId), eq(socialMediaItems.postId, postId)),
    )
    .returning({ id: socialMediaItems.id });
  if (aggiornate.length === 0) {
    esito(postId, "La slide da sostituire non esiste più in questo post");
  }

  let messaggio = "Slide sostituita con la foto caricata";
  try {
    await renderizzaPost(postId);
  } catch (err) {
    messaggio = `Slide sostituita, ma il render è fallito: ${err instanceof Error ? err.message : err}. Riprova con "Rigenera immagini"`;
  }
  esito(postId, messaggio);
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

// Duplica un post verso un'altra piattaforma: bozza nuova con caption,
// hashtag e slide copiate, render rifatto (le chiavi dei JPEG contengono
// il postId: condividerle legherebbe i due post). Si duplica da qualunque
// stato — il caso tipico è il post IG già pubblicato da rifare per
// Facebook — e la copia nasce sempre draft: caption e hashtag si adattano
// alla piattaforma prima di approvare.
export async function duplicaPost(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));
  const platform = z
    .enum(["instagram_feed", "instagram_story", "facebook"])
    .parse(formData.get("platform"));

  const [post] = await db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.id, postId))
    .limit(1);
  if (!post) esito(postId, "Il post da duplicare non esiste più");
  if (post.platform === platform) {
    esito(postId, "Il post è già per questa piattaforma: scegline un'altra");
  }

  const media = await db
    .select()
    .from(socialMediaItems)
    .where(eq(socialMediaItems.postId, postId))
    .orderBy(asc(socialMediaItems.position));
  if (media.length === 0) esito(postId, "Il post non ha immagini: niente da duplicare");
  if (platform === "instagram_story" && media.length > 1) {
    esito(postId, "Una story ha una sola immagine: questo post è un carosello");
  }

  const [copia] = await db
    .insert(socialPosts)
    .values({
      status: "draft",
      platform,
      kind: media.length > 1 ? "carousel" : "single",
      caption: post.caption,
      hashtags: post.hashtags,
      notes: [`Duplicato per ${platform} dal post ${post.id}.`, post.notes]
        .filter(Boolean)
        .join("\n\n"),
      source: "admin",
    })
    .returning({ id: socialPosts.id });

  await db.insert(socialMediaItems).values(
    media.map((m, i) => ({
      postId: copia.id,
      position: i,
      kind: m.kind,
      assetId: m.assetId,
      template: m.template,
      params: m.params,
      width: m.width,
      height: m.height,
    })),
  );

  let messaggio = "Bozza duplicata: adatta caption e hashtag alla piattaforma";
  try {
    await renderizzaPost(copia.id);
  } catch (err) {
    messaggio = `Bozza duplicata, ma il render è fallito: ${err instanceof Error ? err.message : err}. Riprova con "Rigenera immagini"`;
  }
  esito(copia.id, messaggio);
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

// Cancellazione definitiva (solo bozze e archiviati: il controllo vive in
// eliminaPost). Il redirect va alla coda: la pagina del post non c'è più.
export async function eliminaPostAction(formData: FormData) {
  await richiediAdmin();
  const postId = uuid.parse(formData.get("postId"));
  try {
    await eliminaPost(postId);
  } catch (err) {
    esito(postId, err instanceof Error ? err.message : String(err));
  }
  revalidatePath("/admin/social");
  redirect(
    `/admin/social?esito=${encodeURIComponent("Post eliminato definitivamente")}`,
  );
}
