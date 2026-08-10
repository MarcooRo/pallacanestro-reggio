// Le tre forme di un media item — template puro, asset nudo, asset con
// template di composizione — validate in un punto solo, per MCP e admin.
// Il CHECK in DB (social_media_items_forma_check) è la rete; il messaggio
// d'errore leggibile nasce qui.

import { inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/src/db";
import { mediaAssets } from "@/src/db/schema";
import { dimensioniTemplate, getTemplateOg, nomiTemplateOg } from "@/src/lib/og/registry";
import { ErroreTool } from "@/src/lib/social/errore";

// Un solo input per le tre forme; la combinazione si giudica a runtime
// per dare errori parlanti, non con una union Zod che produce messaggi opachi.
export const mediaInput = z.strictObject({
  template: z
    .string()
    .optional()
    .describe("Nome del template, da list_og_templates. Con assetId = composizione"),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Parametri del template. In una composizione imageUrl si compila da solo con l'url dell'asset",
    ),
  assetId: z
    .string()
    .uuid()
    .optional()
    .describe("Foto della libreria (da list_media). Da sola = pubblicata così com'è"),
});

export type MediaInput = z.output<typeof mediaInput>;

/** Valori pronti per l'insert in social_media_items (senza postId/position). */
export interface FormaRisolta {
  kind: "template" | "asset";
  assetId: string | null;
  template: string | null;
  params: unknown | null;
  width: number;
  height: number;
}

function validaTemplate(nome: string, params: unknown, posizione: number) {
  const def = getTemplateOg(nome);
  if (!def) {
    throw new ErroreTool(
      `La slide ${posizione} usa il template "${nome}" che non esiste. Template disponibili: ${nomiTemplateOg().join(", ")}. Usa list_og_templates per gli schemi.`,
    );
  }
  const esito = def.schema.safeParse(params);
  if (!esito.success) {
    throw new ErroreTool(
      `Parametri non validi per la slide ${posizione} (template "${nome}"):\n${z.prettifyError(esito.error)}\nEsempio valido:\n${JSON.stringify(def.esempio, null, 2)}`,
    );
  }
  return { def, params: esito.data };
}

/**
 * Risolve e valida le slide di un post nelle tre forme. Carica gli asset
 * citati (devono esistere ed essere ready) e nelle composizioni inietta
 * `imageUrl` PRIMA della validazione: l'AI non deve ripetere l'url.
 */
export async function risolviMedia(media: MediaInput[]): Promise<FormaRisolta[]> {
  const idCitati = [...new Set(media.flatMap((m) => (m.assetId ? [m.assetId] : [])))];
  const assets = idCitati.length
    ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, idCitati))
    : [];
  const perId = new Map(assets.map((a) => [a.id, a]));

  return media.map((m, i) => {
    const posizione = i + 1;

    if (!m.assetId) {
      if (!m.template || !m.params) {
        throw new ErroreTool(
          `La slide ${posizione} non ha né un assetId né la coppia template+params: serve una delle due cose. Usa list_media per le foto, list_og_templates per le grafiche.`,
        );
      }
      const { def, params } = validaTemplate(m.template, m.params, posizione);
      return {
        kind: "template" as const,
        assetId: null,
        template: def.nome,
        params,
        ...dimensioniTemplate(def),
      };
    }

    const asset = perId.get(m.assetId);
    if (!asset) {
      throw new ErroreTool(
        `La slide ${posizione} cita l'asset ${m.assetId} che non esiste. Usa list_media per vedere le foto disponibili.`,
      );
    }
    if (asset.status !== "ready" || !asset.width || !asset.height) {
      throw new ErroreTool(
        `La slide ${posizione} cita l'asset ${m.assetId} che è ancora pending: il file non è stato caricato o manca confirm_upload.`,
      );
    }

    if (m.template) {
      // Composizione: la foto entra come parametro del template
      const { def, params } = validaTemplate(
        m.template,
        { ...(m.params ?? {}), imageUrl: asset.url },
        posizione,
      );
      return {
        kind: "asset" as const,
        assetId: asset.id,
        template: def.nome,
        params,
        ...dimensioniTemplate(def),
      };
    }

    if (m.params) {
      throw new ErroreTool(
        `La slide ${posizione} ha params senza template: i params appartengono a un template. Per la foto nuda passa solo assetId.`,
      );
    }
    // Asset nudo: se le proporzioni sono fuori dai limiti Instagram il
    // render riquadra a 1080×1350 — le dimensioni finali si decidono qui.
    const riquadrato = fuoriProporzioni(asset.width, asset.height);
    return {
      kind: "asset" as const,
      assetId: asset.id,
      template: null,
      params: null,
      width: riquadrato ? 1080 : asset.width,
      height: riquadrato ? 1350 : asset.height,
    };
  });
}

// Instagram feed accetta da 4:5 (0.8) a 1.91:1. Fuori da lì si riquadra
// a 1080×1350 (cover), mai rifiutare.
export function fuoriProporzioni(width: number, height: number): boolean {
  const rapporto = width / height;
  return rapporto < 0.8 || rapporto > 1.91;
}
