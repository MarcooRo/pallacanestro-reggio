// Il publisher della coda social (fase 2): prende i post approved arrivati
// alla loro ora e li manda su Meta. Gira dentro un cron: deve essere
// idempotente e reggere due corse sovrapposte — per questo il post si
// "prende" con un UPDATE condizionato sullo stato, mai con un select.
//
// Ritentativi: un errore riporta il post in approved (ci riprova la corsa
// dopo) finché i tentativi non arrivano a MAX_TENTATIVI; da lì è failed e
// se ne occupa l'admin. Un post Instagram con META_IG_USER_ID mancante non
// è un errore: resta in coda ad aspettare che il collegamento arrivi.

import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import {
  configMeta,
  pubblicaSuFacebook,
  pubblicaSuInstagram,
} from "@/src/lib/social/meta";

const MAX_TENTATIVI = 3;

export interface EsitoCoda {
  configurato: boolean;
  pubblicati: string[];
  falliti: { postId: string; errore: string }[];
  /** Instagram in attesa del collegamento (META_IG_USER_ID vuoto) */
  inAttesa: number;
}

export async function pubblicaCoda(limite = 5): Promise<EsitoCoda> {
  const esito: EsitoCoda = {
    configurato: false,
    pubblicati: [],
    falliti: [],
    inAttesa: 0,
  };

  const config = configMeta();
  if (!config) return esito; // publisher spento: niente META_* nel .env
  esito.configurato = true;

  const candidati = await db
    .select({
      id: socialPosts.id,
      platform: socialPosts.platform,
      caption: socialPosts.caption,
      hashtags: socialPosts.hashtags,
    })
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, "approved"),
        or(isNull(socialPosts.scheduledAt), lte(socialPosts.scheduledAt, new Date())),
      ),
    )
    .orderBy(asc(socialPosts.createdAt))
    .limit(limite);

  for (const post of candidati) {
    const suInstagram = post.platform.startsWith("instagram");
    if (suInstagram && !config.igUserId) {
      esito.inAttesa += 1;
      continue;
    }

    // La presa in carico: passa solo se il post è ancora approved
    const [preso] = await db
      .update(socialPosts)
      .set({
        status: "publishing",
        attempts: sql`${socialPosts.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(socialPosts.id, post.id), eq(socialPosts.status, "approved")))
      .returning({ attempts: socialPosts.attempts });
    if (!preso) continue;

    try {
      const media = await db
        .select({ renderedUrl: socialMediaItems.renderedUrl })
        .from(socialMediaItems)
        .where(eq(socialMediaItems.postId, post.id))
        .orderBy(asc(socialMediaItems.position));
      const urls = media.map((m) => m.renderedUrl);
      if (urls.length === 0 || urls.some((u) => !u)) {
        throw new Error("media non renderizzati: riapri il post e rigenera le immagini");
      }

      const caption = [post.caption.trim(), post.hashtags.join(" ")]
        .filter(Boolean)
        .join("\n\n");

      const pubblicato = suInstagram
        ? await pubblicaSuInstagram(config, {
            urls: urls as string[],
            caption,
            story: post.platform === "instagram_story",
          })
        : await pubblicaSuFacebook(config, { urls: urls as string[], caption });

      await db
        .update(socialPosts)
        .set({
          status: "published",
          publishedAt: new Date(),
          externalId: pubblicato.externalId,
          permalink: pubblicato.permalink,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(socialPosts.id, post.id));
      esito.pubblicati.push(post.id);
    } catch (err) {
      const errore = err instanceof Error ? err.message : String(err);
      await db
        .update(socialPosts)
        .set({
          status: preso.attempts >= MAX_TENTATIVI ? "failed" : "approved",
          error: errore,
          updatedAt: new Date(),
        })
        .where(eq(socialPosts.id, post.id));
      esito.falliti.push({ postId: post.id, errore });
    }
  }

  return esito;
}
