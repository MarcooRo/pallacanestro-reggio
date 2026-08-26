// Dettaglio di un post in coda: l'immagine REALE generata (il JPEG
// renderizzato, o l'OG firmato se non ancora renderizzato), la caption
// come la mostrerà Instagram — col taglio del "… altro" al punto giusto —
// e il riquadro a 200px per giudicare la leggibilità nel feed.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { branding } from "@/src/branding";
import { FormSostituisciSlide } from "@/src/components/form-sostituisci-slide";
import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataOra } from "@/src/lib/date";
import {
  approvaPost,
  archiviaPost,
  modificaPost,
  rigeneraImmagini,
} from "@/src/lib/social/actions";
import { NOME_PIATTAFORMA } from "@/src/lib/social/etichette";
import { getPostSocial, urlAnteprima } from "@/src/lib/social/queries";

export const metadata: Metadata = { title: "Admin · Social" };

// Instagram tronca la caption nel feed intorno ai 125 caratteri.
const TAGLIO_INSTAGRAM = 125;

export default async function DettaglioPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esito?: string }>;
}) {
  await richiediAdmin();

  const { id } = await params;
  const { esito } = await searchParams;
  const dettaglio = await getPostSocial(id);
  if (!dettaglio) notFound();
  const { post, media } = dettaglio;

  const bozza = post.status === "draft";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8 lg:max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Post · {post.status}</h1>
        <Link
          href="/admin/social"
          className="text-sm font-semibold text-muted hover:text-brand"
        >
          ← Coda
        </Link>
      </div>

      <p className="text-xs text-muted">
        {NOME_PIATTAFORMA[post.platform] ?? post.platform}
        {post.kind === "carousel" ? ` · carosello di ${media.length}` : ""}
        {` · creato da ${post.source} il ${dataOra(post.createdAt)}`}
        {post.scheduledAt ? ` · programmato ${dataOra(post.scheduledAt)}` : ""}
      </p>

      {esito && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">
          {esito}
        </p>
      )}

      {post.error && (
        <p className="rounded-md border border-border-strong px-3 py-2 text-sm">
          Errore di pubblicazione (tentativi: {post.attempts}): {post.error}
        </p>
      )}

      {/* Le slide, nell'ordine di pubblicazione, nel rapporto d'aspetto reale */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide">Anteprima</h2>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {media.map((m) => (
            <figure key={m.id} className="flex w-72 shrink-0 snap-start flex-col gap-1">
              <Image
                src={urlAnteprima(m)}
                alt={`Slide ${m.position + 1}`}
                width={m.width}
                height={m.height}
                className="h-auto w-full rounded-md border border-border"
              />
              <figcaption className="text-xs text-muted">
                {m.position + 1} · {m.template ?? "foto"}
                {m.renderedAt
                  ? ` · JPEG del ${dataOra(m.renderedAt)}`
                  : " · non ancora renderizzata (anteprima dal template)"}
              </figcaption>
              {/* La grafica non convince? La slide si sostituisce con una
                  foto caricata al volo, che entra anche in libreria. */}
              {bozza && <FormSostituisciSlide postId={post.id} itemId={m.id} />}
            </figure>
          ))}
        </div>
      </section>

      {/* A 200px: com'è davvero nel feed che scorre */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide">
          Leggibilità a 200px
        </h2>
        <div className="flex flex-wrap gap-3 rounded-md border border-border p-3">
          {media.map((m) => (
            <Image
              key={m.id}
              src={urlAnteprima(m)}
              alt=""
              width={200}
              height={Math.round((200 * m.height) / m.width)}
              className="rounded-sm"
            />
          ))}
        </div>
      </section>

      <CaptionInstagram caption={post.caption} hashtags={post.hashtags} />

      {post.notes && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Note dell&apos;AI
          </h2>
          <p className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm text-muted">
            {post.notes}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide">Azioni</h2>

        {bozza && (
          <form
            action={approvaPost}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border-strong p-3"
          >
            <input type="hidden" name="postId" value={post.id} />
            <label className="flex items-center gap-2 text-sm">
              Programma per
              <input
                type="datetime-local"
                name="scheduledAt"
                className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
              />
            </label>
            <button
              type="submit"
              className="btn-admin btn-admin-pieno"
            >
              Approva
            </button>
            <p className="w-full text-xs text-muted">
              Senza data si pubblica appena possibile. L&apos;ora è italiana.
            </p>
          </form>
        )}

        {bozza && (
          <form
            action={modificaPost}
            className="flex flex-col gap-2 rounded-md border border-border-strong p-3"
          >
            <input type="hidden" name="postId" value={post.id} />
            <label className="flex flex-col gap-1 text-sm">
              Caption
              <textarea
                name="caption"
                defaultValue={post.caption}
                rows={5}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Hashtag (separati da spazio)
              <input
                type="text"
                name="hashtags"
                defaultValue={post.hashtags.join(" ")}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
              />
            </label>
            <button
              type="submit"
              className="btn-admin btn-admin-bordo self-start"
            >
              Salva modifiche
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          <form action={rigeneraImmagini}>
            <input type="hidden" name="postId" value={post.id} />
            <button
              type="submit"
              className="btn-admin btn-admin-bordo"
            >
              Rigenera immagini
            </button>
          </form>
          {post.status !== "archived" && (
            <form action={archiviaPost}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="btn-admin btn-admin-bordo"
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

// La caption come apparirà davvero: larghezza da feed (~470px), font di
// sistema come Instagram, taglio "… altro" al punto giusto. Gli hashtag
// fanno parte del testo pubblicato, quindi contano nel taglio.
function CaptionInstagram({
  caption,
  hashtags,
}: {
  caption: string;
  hashtags: string[];
}) {
  const testo = [caption.trim(), hashtags.join(" ")].filter(Boolean).join("\n\n");
  const tagliata = testo.length > TAGLIO_INSTAGRAM;
  const visibile = tagliata ? testo.slice(0, TAGLIO_INSTAGRAM).trimEnd() : testo;
  const utente = branding.appShortName.toLowerCase().replaceAll(" ", "");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-black uppercase tracking-wide">
        Caption come su Instagram
      </h2>
      <div className="max-w-[470px] rounded-md border border-border p-3 font-sans text-[14px] leading-[18px]">
        <p className="whitespace-pre-wrap">
          <span className="font-semibold">{utente} </span>
          {visibile || <span className="text-muted">(senza caption)</span>}
          {tagliata && <span className="text-muted">… altro</span>}
        </p>
        {tagliata && (
          <details className="mt-2 text-muted">
            <summary className="cursor-pointer text-xs">testo completo</summary>
            <p className="mt-1 whitespace-pre-wrap text-sm">{testo}</p>
          </details>
        )}
      </div>
    </section>
  );
}
