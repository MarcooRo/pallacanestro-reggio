// Render dei media di un post: template + params → PNG (satori, in
// processo: stesso codice dell'endpoint /api/og, senza rifare il giro
// HTTP con la firma) → JPEG con sharp → bucket pubblico Supabase.
//
// Il JPEG non è un vezzo: Instagram accetta SOLO JPEG e ImageResponse
// produce PNG. chromaSubsampling 4:4:4 perché il testo su fondo scuro
// col subsampling di default si sporca ai bordi.
//
// Idempotente: rilanciato sullo stesso post rigenera e sovrascrive
// (upsert sulla stessa chiave; l'URL salvato cambia solo nella ?v=,
// che buca la cache CDN di Supabase).

import { asc, eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import { db } from "@/src/db";
import { socialMediaItems, socialPosts } from "@/src/db/schema";
import { fontOg } from "@/src/lib/og/font";
import { dimensioniTemplate, getTemplateOg } from "@/src/lib/og/registry";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const BUCKET = "social";

export interface EsitoRender {
  postId: string;
  renderizzati: { position: number; url: string }[];
}

async function pngDaTemplate(template: string, params: unknown): Promise<{
  png: ArrayBuffer;
  width: number;
  height: number;
}> {
  const def = getTemplateOg(template);
  if (!def) throw new Error(`template "${template}" inesistente nel registry`);
  const esito = def.schema.safeParse(params);
  if (!esito.success) {
    throw new Error(`parametri non validi per "${template}": ${esito.error.message}`);
  }
  const dimensioni = dimensioniTemplate(def);
  const risposta = new ImageResponse(def.render(esito.data), {
    ...dimensioni,
    fonts: await fontOg(),
  });
  return { png: await risposta.arrayBuffer(), ...dimensioni };
}

/** Rigenera tutti i media di un post e salva gli URL pubblici. */
export async function renderizzaPost(postId: string): Promise<EsitoRender> {
  const [post] = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(eq(socialPosts.id, postId))
    .limit(1);
  if (!post) throw new Error(`post ${postId} inesistente`);

  const items = await db
    .select()
    .from(socialMediaItems)
    .where(eq(socialMediaItems.postId, postId))
    .orderBy(asc(socialMediaItems.position));
  if (items.length === 0) throw new Error(`il post ${postId} non ha media da renderizzare`);

  const supabase = createSupabaseAdminClient();
  const renderizzati: EsitoRender["renderizzati"] = [];

  for (const item of items) {
    const { png, width, height } = await pngDaTemplate(item.template, item.params);

    const jpeg = await sharp(Buffer.from(png))
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
      .toBuffer();

    const chiave = `${postId}/${item.position}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(chiave, jpeg, { contentType: "image/jpeg", upsert: true });
    if (error) {
      throw new Error(
        `upload di ${chiave} sul bucket "${BUCKET}" fallito: ${error.message}`,
      );
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(chiave);
    // ?v= buca la cache CDN quando la stessa chiave viene sovrascritta
    const url = `${data.publicUrl}?v=${Date.now()}`;

    await db
      .update(socialMediaItems)
      .set({ renderedUrl: url, renderedAt: new Date(), width, height })
      .where(eq(socialMediaItems.id, item.id));

    renderizzati.push({ position: item.position, url });
  }

  await db
    .update(socialPosts)
    .set({ updatedAt: new Date() })
    .where(eq(socialPosts.id, postId));

  return { postId, renderizzati };
}
