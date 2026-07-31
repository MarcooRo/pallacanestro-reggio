// Gestisce il link di accesso contenuto nell'email OTP di Supabase
// (template con {{ .TokenHash }}). Il codice a 6 cifre resta la via
// principale su /accesso/verifica: questo è il percorso "un clic".

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getProfilo } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

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
      redirect(profilo ? "/" : "/benvenuto");
    }
  }

  redirect(`/accesso?errore=${encodeURIComponent("Link non valido o scaduto")}`);
}
