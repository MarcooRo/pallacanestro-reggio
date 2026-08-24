"use server";

// Server actions dell'identità: nickname, ripristino del cookie dalla copia
// in localStorage, e login/logout admin.

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import {
  apriSessioneAdmin,
  chiudiSessioneAdmin,
  leggiHashAdmin,
} from "@/src/lib/identita/admin";
import { verificaPassword } from "@/src/lib/identita/password";
import {
  idDaToken,
  leggiIdCorrente,
  scriviIdentita,
} from "@/src/lib/identita/cookie";
import { concediPerIp, ipDaHeaders } from "@/src/lib/identita/limite";
import { ottieniOCreaProfilo } from "@/src/lib/identita/sessione";

const nicknameSchema = z
  .string()
  .trim()
  .min(3, "Il nickname deve avere almeno 3 caratteri")
  .max(20, "Il nickname può avere al massimo 20 caratteri")
  .regex(
    /^[a-zA-Z0-9_. ]+$/,
    "Solo lettere, numeri, spazi, punti e trattini bassi",
  );

/** Sceglie o cambia il nickname pubblico. Crea l'identità se non c'è. */
export async function aggiornaNickname(formData: FormData) {
  const parsed = nicknameSchema.safeParse(formData.get("nickname"));
  if (!parsed.success) {
    redirect(
      `/profilo?errore=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const profilo = await ottieniOCreaProfilo();
  if (!profilo) {
    redirect(`/profilo?errore=${encodeURIComponent("Riprova tra un minuto")}`);
  }

  try {
    await db
      .update(profiles)
      .set({ nickname: parsed.data })
      .where(eq(profiles.id, profilo.id));
  } catch (err) {
    // 23505 = violazione unique: nickname già in uso
    if (err instanceof Error && "code" in err && err.code === "23505") {
      redirect(
        `/profilo?errore=${encodeURIComponent("Nickname già in uso, scegline un altro")}`,
      );
    }
    throw err;
  }

  redirect("/profilo");
}

/**
 * Il client ha in localStorage un token che il browser ha perso dal cookie:
 * se la firma regge e il profilo esiste, il cookie torna al suo posto.
 * Non sovrascrive mai un'identità già presente.
 */
export async function ripristinaIdentita(token: string): Promise<void> {
  if (typeof token !== "string" || token.length > 100) return;
  const id = idDaToken(token);
  if (!id) return;
  if (await leggiIdCorrente()) return;

  const [esiste] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  if (esiste) await scriviIdentita(id);
}

// ---- Admin ----

export async function accediAdmin(formData: FormData) {
  const ip = ipDaHeaders(await headers());
  if (!concediPerIp(`admin:${ip}`, 5, 60_000)) {
    redirect(
      `/admin/accesso?errore=${encodeURIComponent("Troppi tentativi: aspetta un minuto")}`,
    );
  }

  const password = formData.get("password");
  const hash = await leggiHashAdmin();
  if (
    typeof password !== "string" ||
    !password ||
    !hash ||
    !verificaPassword(password, hash)
  ) {
    redirect(`/admin/accesso?errore=${encodeURIComponent("Password sbagliata")}`);
  }

  await apriSessioneAdmin();
  redirect("/admin");
}

export async function esciAdmin() {
  await chiudiSessioneAdmin();
  redirect("/");
}
