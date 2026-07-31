// Imposta la password di un utente esistente (nato col flusso OTP).
// Uso: bun scripts/imposta-password.ts email@esempio.it lapassword
// Richiede SUPABASE_SECRET_KEY in .env.local (chiave admin, mai nel client).

import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Uso: bun scripts/imposta-password.ts <email> <password ≥8 caratteri>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await admin.auth.admin.listUsers();
if (error) throw error;
const utente = data.users.find((u) => u.email === email.toLowerCase());
if (!utente) {
  console.error(`Nessun utente con email ${email}`);
  process.exit(1);
}

const { error: errore } = await admin.auth.admin.updateUserById(utente.id, {
  password,
});
if (errore) throw errore;
console.log(`Password impostata per ${email}. Ora puoi accedere da /accesso.`);
process.exit(0);
