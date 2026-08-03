// Modalità ospite: chi sceglie "Continua senza account" vede la home
// normale al posto della vetrina. È un cookie di sessione (nessun maxAge):
// alla riapertura dell'app la vetrina torna a proporre la registrazione.
// httpOnly perché lo legge solo il server: nessun uso lato client.

import { cookies } from "next/headers";

export const COOKIE_OSPITE = "ospite";

export async function isOspite(): Promise<boolean> {
  return (await cookies()).get(COOKIE_OSPITE)?.value === "1";
}
