// Dettaglio di un articolo nostro: l'anteprima è il testo impaginato con
// lo STESSO componente della pagina pubblica (CorpoArticolo), quindi quello
// che si legge qui è esattamente quello che va online. Da qui, e solo da
// qui, si pubblica.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CorpoArticolo } from "@/src/components/corpo-articolo";
import { getProfilo } from "@/src/lib/auth/session";
import { dataOra } from "@/src/lib/date";
import {
  archiviaArticoloAction,
  correggiTestata,
  fissaInAlto,
  pubblicaArticolo,
  riportaInBozza,
} from "@/src/lib/news/actions";
import { numeroParole } from "@/src/lib/news/blocchi";
import { getNewsQualsiasiStato } from "@/src/lib/news/queries";

export const metadata: Metadata = { title: "Admin · Articoli" };

export default async function DettaglioArticoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esito?: string }>;
}) {
  const profilo = await getProfilo();
  if (!profilo || profilo.role !== "admin") notFound();

  const { id } = await params;
  const { esito } = await searchParams;
  const articolo = await getNewsQualsiasiStato(id);
  // Le news di fonte esterna non si gestiscono da qui: hanno un'altra vita
  if (!articolo || articolo.source !== "redazione") notFound();

  const bozza = articolo.status === "draft";
  const pubblicato = articolo.status === "published";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8 lg:max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Articolo · {articolo.status}</h1>
        <Link
          href="/admin/news"
          className="text-sm font-semibold text-muted hover:text-brand"
        >
          ← Articoli
        </Link>
      </div>

      <p className="text-xs text-muted">
        {articolo.body ? `${numeroParole(articolo.body)} parole` : "senza corpo"}
        {` · aggiornato ${dataOra(articolo.updatedAt)}`}
        {pubblicato ? ` · online dal ${dataOra(articolo.publishedAt)}` : ""}
        {articolo.isPinned ? " · in evidenza" : ""}
      </p>

      {esito && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">
          {esito}
        </p>
      )}

      {pubblicato && articolo.slug && (
        <Link
          href={`/news/${articolo.slug}`}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Vedi in pagina → /news/{articolo.slug}
        </Link>
      )}

      {/* Anteprima: identica alla pagina pubblica, nota AI compresa */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide">Anteprima</h2>
        <article className="flex flex-col gap-3 rounded-md border border-border p-4">
          <p className="eyebrow">
            <span className="font-bold !text-brand-vivid">Redazione</span>
            {articolo.category ? ` · ${articolo.category}` : ""}
          </p>
          <h3 className="display text-2xl">{articolo.title}</h3>
          <div className="flex flex-col gap-0.5">
            {articolo.authorName && (
              <p className="text-sm font-semibold">di {articolo.authorName}</p>
            )}
            <p className="text-[11px] text-muted">Generato in parte con AI</p>
          </div>
          {articolo.imageUrl && (
            <Image
              src={articolo.imageUrl}
              alt=""
              width={800}
              height={450}
              className="w-full rounded-md object-cover"
            />
          )}
          {articolo.excerpt && (
            <p className="text-sm text-muted italic">{articolo.excerpt}</p>
          )}
          {articolo.body && <CorpoArticolo blocchi={articolo.body} />}
        </article>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide">Azioni</h2>

        {bozza && (
          <form
            action={pubblicaArticolo}
            className="flex flex-wrap items-end gap-2 rounded-md border border-border-strong p-3"
          >
            <input type="hidden" name="id" value={articolo.id} />
            <label className="flex items-center gap-2 text-sm">
              Data
              <input
                type="datetime-local"
                name="publishedAt"
                className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-on-brand"
            >
              Pubblica
            </button>
            <p className="w-full text-xs text-muted">
              Senza data vale adesso. L&apos;ora è italiana. Appena pubblicato è
              visibile a tutti in /news.
            </p>
          </form>
        )}

        {/* Titolo, sommario e firma si correggono a mano in qualsiasi stato:
            sono ciò che si legge nella lista e nelle condivisioni. Lo slug no,
            resta quello: un link già girato non deve rompersi. */}
        <form
          action={correggiTestata}
          className="flex flex-col gap-2 rounded-md border border-border-strong p-3"
        >
          <input type="hidden" name="id" value={articolo.id} />
          <label className="flex flex-col gap-1 text-sm">
            Titolo
            <input
              type="text"
              name="title"
              defaultValue={articolo.title}
              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sommario
            <textarea
              name="excerpt"
              defaultValue={articolo.excerpt ?? ""}
              rows={3}
              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Firma
            <input
              type="text"
              name="authorName"
              defaultValue={articolo.authorName ?? ""}
              placeholder="vuoto = solo Redazione"
              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface"
          >
            Salva testata
          </button>
          <p className="text-xs text-muted">
            Il corpo si corregge dall&apos;AI con update_article, finché è bozza.
          </p>
        </form>

        <div className="flex flex-wrap gap-2">
          {pubblicato && (
            <>
              <form action={fissaInAlto}>
                <input type="hidden" name="id" value={articolo.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface"
                >
                  {articolo.isPinned ? "Togli dall'evidenza" : "Fissa in alto"}
                </button>
              </form>
              <form action={riportaInBozza}>
                <input type="hidden" name="id" value={articolo.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface"
                >
                  Ritira dal sito
                </button>
              </form>
            </>
          )}
          {articolo.status !== "archived" && (
            <form action={archiviaArticoloAction}>
              <input type="hidden" name="id" value={articolo.id} />
              <button
                type="submit"
                className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold hover:bg-surface"
              >
                Archivia
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
