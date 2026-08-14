"use server";

// Server actions della libreria media. Il ruolo si verifica QUI, in ogni
// action, come in tutto il progetto: il client non decide niente.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getProfilo } from "@/src/lib/auth/session";
import {
  aggiornaAsset,
  cancellaAsset,
  caricaAsset,
  importaAssetDaUrl,
} from "@/src/lib/media/libreria";

const uuid = z.string().uuid();

async function richiediAdmin() {
  const profilo = await getProfilo();
  if (!profilo || profilo.role !== "admin") redirect("/");
}

function esito(messaggio: string): never {
  revalidatePath("/admin/media");
  redirect(`/admin/media?esito=${encodeURIComponent(messaggio)}`);
}

// Più file in un colpo solo: al palazzetto si scatta a raffica. Didascalia
// e tag valgono per tutto il gruppo, si raffinano dopo, foto per foto.
export async function caricaFoto(formData: FormData) {
  await richiediAdmin();

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) esito("Nessun file selezionato");

  const caption = String(formData.get("caption") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

  let caricate = 0;
  const errori: string[] = [];
  for (const file of files) {
    try {
      await caricaAsset(Buffer.from(await file.arrayBuffer()), {
        source: "admin",
        caption,
        tags,
      });
      caricate += 1;
    } catch (err) {
      errori.push(`${file.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  esito(
    errori.length
      ? `${caricate} foto caricate, ${errori.length} no — ${errori.join("; ")}`
      : `${caricate === 1 ? "1 foto caricata" : `${caricate} foto caricate`}`,
  );
}

// Import da URL: comodo quando la foto è già online (una nostra grafica, un
// media kit) e non la si vuole passare dal telefono. Uno alla volta, con la
// provenienza salvata in origin_url — chi approva il post deve poter vedere
// che quell'immagine non è nostra.
export async function importaFotoDaUrl(formData: FormData) {
  await richiediAdmin();

  const indirizzo = String(formData.get("url") ?? "").trim();
  if (!indirizzo) esito("Nessun URL indicato");

  const caption = String(formData.get("caption") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

  // esito() fa redirect(), che internamente è un throw: va chiamata FUORI
  // dal try, altrimenti il catch si mangia il redirect di successo.
  let messaggio: string;
  try {
    const asset = await importaAssetDaUrl(indirizzo, {
      source: "admin",
      caption,
      tags,
    });
    messaggio = `Foto importata da URL (${asset.width}×${asset.height})`;
  } catch (err) {
    messaggio = `Import non riuscito — ${err instanceof Error ? err.message : err}`;
  }
  esito(messaggio);
}

export async function modificaFoto(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("assetId"));
  await aggiornaAsset(id, {
    caption: String(formData.get("caption") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(/[\s,]+/)
      .filter(Boolean),
  });
  esito("Foto aggiornata");
}

export async function cancellaFoto(formData: FormData) {
  await richiediAdmin();
  const id = uuid.parse(formData.get("assetId"));
  try {
    await cancellaAsset(id);
  } catch (err) {
    esito(`Non cancellata: ${err instanceof Error ? err.message : err}`);
  }
  esito("Foto cancellata");
}
