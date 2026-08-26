// Il catalogo dei template OG, renderizzati coi parametri d'esempio del
// registry: la pagina per rendersi conto di cosa c'è e com'è fatto,
// prima di chiedere una grafica all'AI o di giudicarne una in coda.
// Stessa fonte di verità dell'MCP (registry): niente elenchi a mano.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { richiediAdmin } from "@/src/lib/identita/admin";
import { elencaAssets } from "@/src/lib/media/libreria";
import { signOgUrl } from "@/src/lib/og/firma";
import { dimensioniTemplate, tuttiTemplateOg } from "@/src/lib/og/registry";

export const metadata: Metadata = { title: "Admin · Template social" };

const NOME_FORMATO: Record<string, string> = {
  feed: "feed",
  story: "story",
};

export default async function AdminTemplateSocialPage() {
  await richiediAdmin();

  const templates = tuttiTemplateOg();
  // La foto più recente della libreria fa da sfondo di prova: così la
  // variante fotografica si giudica su materiale nostro, non su un mockup.
  const [foto] = await elencaAssets({ limite: 1 });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 lg:max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin · Template social</h1>
        <Link
          href="/admin/social"
          className="text-sm font-semibold text-muted hover:text-brand"
        >
          ← Social
        </Link>
      </div>
      <p className="text-sm text-muted">
        Tutte le grafiche che l&apos;AI può usare nei post, renderizzate coi
        parametri d&apos;esempio: quello che vedi è il render vero, non un
        mockup. I template vivono nel codice: per cambiarne uno o
        aggiungerne si passa da lì.
      </p>

      <div className="flex flex-col gap-5">
        {templates.map((t) => {
          const { width, height } = dimensioniTemplate(t);
          // La variante fotografica esiste se lo schema accetta imageUrl
          // oltre all'esempio: si scopre provando, senza elenchi a mano.
          const conFoto = foto
            ? t.schema.safeParse({ ...(t.esempio as object), imageUrl: foto.url })
            : null;
          // Se l'esempio del registry ha già un imageUrl è un URL finto,
          // che satori non può scaricare: con una foto vera in libreria
          // il render base si salta e resta solo la variante reale.
          const mostraBase = !(
            conFoto?.success && "imageUrl" in (t.esempio as Record<string, unknown>)
          );
          return (
            <section
              key={t.nome}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <h2 className="text-sm font-black uppercase tracking-wide">
                {t.nome}
              </h2>
              <p className="text-sm text-muted">{t.descrizione}</p>
              <p className="text-xs text-muted">
                {NOME_FORMATO[t.formato] ?? t.formato} · {width}×{height}
              </p>
              <div className="flex flex-wrap gap-3">
                {mostraBase && (
                  <Image
                    src={signOgUrl(t.nome, t.esempio)}
                    alt={`Render d'esempio del template ${t.nome}`}
                    width={width}
                    height={height}
                    className="w-full max-w-sm self-start rounded-md border border-border"
                  />
                )}
                {conFoto?.success && (
                  <figure className="flex w-full max-w-sm flex-col gap-1">
                    <Image
                      src={signOgUrl(t.nome, conFoto.data)}
                      alt={`Render del template ${t.nome} con sfondo fotografico`}
                      width={width}
                      height={height}
                      className="rounded-md border border-border"
                    />
                    <figcaption className="text-xs text-muted">
                      con sfondo fotografico (l&apos;ultima foto della libreria)
                    </figcaption>
                  </figure>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
