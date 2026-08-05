// Gestisce il link di accesso contenuto nell'email OTP di Supabase
// (template con {{ .TokenHash }}): il percorso "un clic".
//
// type=recovery arriva dal recupero password: in quel caso si va alla
// schermata della nuova password, che il link porta in ?next=.

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getProfilo } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { percorsoInterno } from "@/src/lib/url";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      const profilo = await getProfilo();
      const predefinito =
        type === "recovery" ? "/accesso/nuova-password" : profilo ? "/" : "/benvenuto";
      redirect(percorsoInterno(url.searchParams.get("next"), predefinito));
    }
  }

  redirect(`/accesso?errore=${encodeURIComponent("Link non valido o scaduto")}`);
}
