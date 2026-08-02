"use server";

// Server actions di autenticazione: email + password (login classico,
// scelta v1 per la cerchia ristretta) e creazione del profilo con
// nickname pubblico. Niente conferma email: l'utente nasce già
// confermato via API admin, così la registrazione non dipende dal
// toggle in dashboard e non parte nessuna email di Supabase.
// Email di benvenuto e recupero password arriveranno con l'SMTP (Resend).

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri");

const nicknameSchema = z
  .string()
  .trim()
  .min(3, "Il nickname deve avere almeno 3 caratteri")
  .max(20, "Il nickname può avere al massimo 20 caratteri")
  .regex(
    /^[a-zA-Z0-9_. ]+$/,
    "Solo lettere, numeri, spazi, punti e trattini bassi",
  );

function credenziali(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  return { email, password };
}

export async function accedi(formData: FormData) {
  const { email, password } = credenziali(formData);
  if (!email.success || !password.success) {
    redirect(`/accesso?errore=${encodeURIComponent("Email o password non validi")}`);
  }

  const supabase = await createSupabaseServerClient();
  let { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });

  // Utente nato quando la conferma email era ancora accesa: lo confermiamo
  // al volo e riproviamo. Innocuo: senza la password giusta non si entra.
  if (error?.code === "email_not_confirmed") {
    await confermaEmail(email.data);
    ({ error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    }));
  }

  if (error) {
    redirect(
      `/accesso?errore=${encodeURIComponent("Email o password sbagliati. Se è la prima volta, registrati.")}`,
    );
  }

  const profilo = await getProfilo();
  redirect(profilo ? "/" : "/benvenuto");
}

// Marca come confermata l'email di un utente esistente, via API admin.
// L'API non cerca per email: con la cerchia ristretta listUsers basta.
async function confermaEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const utente = data?.users.find((u) => u.email === email);
  if (utente) {
    await admin.auth.admin.updateUserById(utente.id, { email_confirm: true });
  }
}

export async function registrati(formData: FormData) {
  const { email, password } = credenziali(formData);
  if (!email.success) {
    redirect(`/registrati?errore=${encodeURIComponent("Inserisci una email valida")}`);
  }
  if (!password.success) {
    redirect(
      `/registrati?errore=${encodeURIComponent(password.error.issues[0].message)}`,
    );
  }

  // Creazione via API admin con email già confermata, poi login immediato:
  // zero email in giro finché non ci sarà quella di benvenuto via Resend.
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: email.data,
    password: password.data,
    email_confirm: true,
  });

  if (error) {
    const messaggio =
      error.code === "email_exists" || error.code === "user_already_exists"
        ? "Questa email è già registrata: accedi"
        : "Registrazione non riuscita, riprova";
    redirect(`/registrati?errore=${encodeURIComponent(messaggio)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: erroreAccesso } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });

  // Creato ma non entrato: non deve succedere, ma se succede il login
  // classico funziona comunque.
  if (erroreAccesso) {
    redirect(`/accesso?errore=${encodeURIComponent("Account creato: accedi")}`);
  }

  redirect("/benvenuto");
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
