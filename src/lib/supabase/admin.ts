// Client Supabase con la chiave segreta (API admin di GoTrue).
// SOLO dentro server action o script: la chiave non deve mai
// raggiungere il client. Nessun cookie: non gestisce sessioni.

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
