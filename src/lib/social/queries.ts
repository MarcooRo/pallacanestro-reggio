// Letture per la pagina admin social. Come tutte le query del progetto:
// solo da server component e server action.

import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import { signOgUrl } from "@/src/lib/og/firma";

export type PostSocial = typeof socialPosts.$inferSelect;
export type MediaSocial = typeof socialMediaItems.$inferSelect;

/**
 * L'immagine da mostrare in anteprima: il JPEG renderizzato se c'è,
 * altrimenti l'URL OG firmato — comunque l'immagine reale generata dal
 * template, mai un mockup. Un asset nudo non ancora renderizzato (caso
 * raro: il render parte alla creazione) mostra un segnaposto.
 */
export function urlAnteprima(media: MediaSocial): string {
  if (media.renderedUrl) return media.renderedUrl;
  if (media.template) return signOgUrl(media.template, media.params);
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="#1a1a1c"/></svg>',
    )
  );
}

export interface RigaPostSocial {
  post: PostSocial;
  anteprima: MediaSocial | null;
  numeroMedia: number;
}

export async function getPostsSocial(): Promise<RigaPostSocial[]> {
  const posts = await db
    .select()
    .from(socialPosts)
    .orderBy(desc(socialPosts.updatedAt));
  if (posts.length === 0) return [];

  const media = await db
    .select()
    .from(socialMediaItems)
    .where(
      inArray(
        socialMediaItems.postId,
        posts.map((p) => p.id),
      ),
    )
    .orderBy(asc(socialMediaItems.position));

  const perPost = new Map<string, MediaSocial[]>();
  for (const m of media) {
    const lista = perPost.get(m.postId) ?? [];
    lista.push(m);
    perPost.set(m.postId, lista);
  }

  return posts.map((post) => {
    const lista = perPost.get(post.id) ?? [];
    return { post, anteprima: lista[0] ?? null, numeroMedia: lista.length };
  });
}

export async function getPostSocial(
  id: string,
): Promise<{ post: PostSocial; media: MediaSocial[] } | null> {
  const [post] = await db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.id, id))
    .limit(1);
  if (!post) return null;

  const media = await db
    .select()
    .from(socialMediaItems)
    .where(eq(socialMediaItems.postId, id))
    .orderBy(asc(socialMediaItems.position));

  return { post, media };
}
