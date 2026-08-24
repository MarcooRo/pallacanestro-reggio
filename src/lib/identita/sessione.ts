// Chi è il tifoso corrente. Nessun login: l'identità è il cookie firmato
// del dispositivo, e il profilo (anonimo, nickname facoltativo) nasce alla
// prima partecipazione — mai alla semplice visita, così i crawler non
// riempiono la tabella.

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { leggiIdCorrente, scriviIdentita } from "@/src/lib/identita/cookie";
import { concediPerIp, ipDaHeaders } from "@/src/lib/identita/limite";

export const getProfilo = cache(async () => {
  const id = await leggiIdCorrente();
  if (!id) return null;

  const [profilo] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  return profilo ?? null;
});

/**
 * Il profilo per una partecipazione (voto, reazione, pronostico…): quello
 * esistente, o uno creato al volo. Chiamabile SOLO da server action (deve
 * poter scrivere il cookie). Restituisce null solo se l'IP sta sfornando
 * identità a raffica: chi la riceve risponda con un errore garbato.
 */
export async function ottieniOCreaProfilo() {
  const esistente = await getProfilo();
  if (esistente) return esistente;

  // La creazione è l'unico gesto "gratis", quindi è l'unico vincolato
  // all'IP: 10 identità nuove al minuto bastano a una curva, non a uno script.
  const ip = ipDaHeaders(await headers());
  if (!concediPerIp(`identita:${ip}`, 10, 60_000)) return null;

  const [profilo] = await db.insert(profiles).values({}).returning();
  await scriviIdentita(profilo.id);
  return profilo;
}
