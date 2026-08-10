// Modalità ospite: chi tocca "Entra" in vetrina vede la home normale,
// senza account. È un cookie di sessione (nessun maxAge): alla riapertura
// dell'app si ripassa dalla vetrina, un tap e si è di nuovo dentro.
// httpOnly perché lo legge solo il server: nessun uso lato client.

import { cookies } from "next/headers";

export const COOKIE_OSPITE = "ospite";

export async function isOspite(): Promise<boolean> {
  return (await cookies()).get(COOKIE_OSPITE)?.value === "1";
}
