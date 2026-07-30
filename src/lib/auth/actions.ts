"use server";

// Server actions di autenticazione: OTP via email (Supabase Auth)
// e creazione del profilo con nickname pubblico.

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().email();

const nicknameSchema = z
  .string()
  .trim()
  .min(3, "Il nickname deve avere almeno 3 caratteri")
  .max(20, "Il nickname può avere al massimo 20 caratteri")
  .regex(
    /^[a-zA-Z0-9_. ]+$/,
    "Solo lettere, numeri, spazi, punti e trattini bassi",
  );

export async function inviaOtp(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    redirect(`/accesso?errore=${encodeURIComponent("Inserisci una email valida")}`);
  }
  const email = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    redirect(
      `/accesso?errore=${encodeURIComponent("Invio del codice non riuscito, riprova tra qualche minuto")}`,
    );
  }

  redirect(`/accesso/verifica?email=${encodeURIComponent(email)}`);
}

export async function verificaOtp(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const token = z.string().trim().min(6).safeParse(formData.get("token"));

  if (!email.success || !token.success) {
    redirect(`/accesso?errore=${encodeURIComponent("Codice non valido")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  });

  if (error) {
    redirect(
      `/accesso/verifica?email=${encodeURIComponent(email.data)}&errore=${encodeURIComponent("Codice errato o scaduto")}`,
    );
  }

  // Primo accesso: prima di entrare serve il nickname pubblico.
  const profilo = await getProfilo();
  redirect(profilo ? "/" : "/benvenuto");
}

export async function creaProfilo(formData: FormData) {
  const utente = await getUtente();
  if (!utente) redirect("/accesso");

  const parsed = nicknameSchema.safeParse(formData.get("nickname"));
  if (!parsed.success) {
    redirect(
      `/benvenuto?errore=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  try {
    await db.insert(profiles).values({ id: utente.id, nickname: parsed.data });
  } catch (err) {
    // 23505 = violazione unique: nickname già in uso
    if (err instanceof Error && "code" in err && err.code === "23505") {
      redirect(
        `/benvenuto?errore=${encodeURIComponent("Nickname già in uso, scegline un altro")}`,
      );
    }
    throw err;
  }

  redirect("/");
}

export async function esci() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
