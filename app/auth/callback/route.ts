// Gestisce il rientro dal link dell'email PREDEFINITA di Supabase
// (flusso PKCE: arriva ?code=... da scambiare per la sessione).
// Serve finché non c'è un SMTP custom: senza SMTP i template email non
// sono modificabili e l'email contiene solo questo tipo di link.
// Il template custom userà invece /auth/confirm (token_hash).

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getProfilo } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const profilo = await getProfilo();
      redirect(profilo ? "/" : "/benvenuto");
    }
  }

  redirect(`/accesso?errore=${encodeURIComponent("Link non valido o scaduto")}`);
}
