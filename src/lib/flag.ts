// Interruttori delle funzionalità di partecipazione, in app_settings.
// Servono a costruire una feature e tenerla spenta finché non ha senso
// mostrarla: un contatore "Io ci sono" con quattro iscritti fa più danno
// che bene. L'admin li accende senza redeploy.

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/src/db";
import { appSettings } from "@/src/db/schema";

export const CHIAVE_FLAG = "feature_flags";

export interface Flag {
  ioCiSono: boolean;
  boato: boolean;
  reazioni: boolean;
  pronostici: boolean;
}

// Valori di partenza: quello che vale se in app_settings non c'è ancora
// nulla. "Io ci sono" nasce spenta per scelta.
export const FLAG_DEFAULT: Flag = {
  ioCiSono: false,
  boato: true,
  reazioni: true,
  pronostici: true,
};

export const NOMI_FLAG: Record<keyof Flag, string> = {
  ioCiSono: "Io ci sono",
  boato: "Il boato",
  reazioni: "Reazioni al risultato",
  pronostici: "Pronostici",
};

export const CHIAVI_FLAG = Object.keys(FLAG_DEFAULT) as (keyof Flag)[];

// jsonb: si valida qui, senza fidarsi della forma salvata. Una chiave
// mancante o spazzatura ricade sul default, non fa esplodere la pagina.
function normalizza(valore: unknown): Flag {
  const grezzo = (valore ?? {}) as Record<string, unknown>;
  const flag = { ...FLAG_DEFAULT };
  for (const chiave of CHIAVI_FLAG) {
    if (typeof grezzo[chiave] === "boolean") flag[chiave] = grezzo[chiave];
  }
  return flag;
}

// cache(): più componenti della stessa pagina chiedono i flag, la query
// si fa una volta sola.
export const getFlag = cache(async (): Promise<Flag> => {
  const [riga] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, CHIAVE_FLAG))
    .limit(1);
  return normalizza(riga?.value);
});
