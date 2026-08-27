// Cancellazione definitiva di un post della coda: solo bozze e archiviati,
// per costruzione — un pubblicato resta a registro (external_id, permalink),
// un approvato/fallito prima si archivia, così l'eliminazione è sempre un
// gesto in due tempi. Le immagini generate (social/{postId}/{n}.jpg) si
// tolgono dall'archivio; le foto della libreria citate dalle slide NON si
// toccano. Condivisa da server action admin e tool MCP.

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import { cancellaFile } from "@/src/lib/media/archivio";
import { ErroreTool } from "@/src/lib/social/errore";

const ELIMINABILI = new Set(["draft", "archived"]);

export async function eliminaPost(postId: string): Promise<void> {
  const [post] = await db
    .select({ status: socialPosts.status })
    .from(socialPosts)
    .where(eq(socialPosts.id, postId))
    .limit(1);
  if (!post) {
    throw new ErroreTool(`Il post ${postId} non esiste (forse è già stato eliminato).`);
  }
  if (!ELIMINABILI.has(post.status)) {
    throw new ErroreTool(
      `Il post è in stato "${post.status}": si eliminano solo bozze e archiviati. Un pubblicato resta a registro; un approvato o fallito prima si archivia.`,
    );
  }

  const media = await db
    .select({ position: socialMediaItems.position })
    .from(socialMediaItems)
    .where(eq(socialMediaItems.postId, postId));
  // force: un asset nudo può non avere mai avuto un JPEG suo — non è un errore
  for (const m of media) {
    await cancellaFile(`social/${postId}/${m.position}.jpg`);
  }

  // Le slide cadono in cascata (FK on delete cascade)
  await db.delete(socialPosts).where(eq(socialPosts.id, postId));
}
