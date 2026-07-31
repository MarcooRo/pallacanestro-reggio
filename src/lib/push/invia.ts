// Invio delle web push per categoria. Chiamato dalle server actions
// (apertura voto, pubblicazione pagella): un fallimento di invio non deve
// mai far fallire l'azione che lo innesca.

import { eq, sql } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/src/db";
import { pushSubscriptions } from "@/src/db/schema";

export type CategoriaPush = "vote_open" | "vote_closing" | "tally_published";

export interface PayloadPush {
  title: string;
  body: string;
  url: string;
}

let configurato = false;
function configura(): boolean {
  if (configurato) return true;
  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } =
    process.env;
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configurato = true;
  return true;
}

export async function inviaPushCategoria(
  categoria: CategoriaPush,
  payload: PayloadPush,
): Promise<void> {
  if (!configura()) {
    console.warn("Push non configurate: chiavi VAPID mancanti");
    return;
  }

  const sottoscrizioni = await db
    .select()
    .from(pushSubscriptions)
    .where(sql`${categoria} = any(${pushSubscriptions.categories})`);

  const corpo = JSON.stringify(payload);

  await Promise.allSettled(
    sottoscrizioni.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: s.keys as { p256dh: string; auth: string },
          },
          corpo,
        );
      } catch (err) {
        // 404/410 = sottoscrizione morta (browser disinstallato, permesso
        // revocato): si elimina, non è un errore.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, s.endpoint));
        } else {
          console.warn(`Push fallita verso ${s.endpoint.slice(0, 40)}…:`, err);
        }
      }
    }),
  );
}
