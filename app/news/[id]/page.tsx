import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { CorpoArticolo } from "@/src/components/corpo-articolo";
import { fonteDiCasa, nomeFonte } from "@/src/components/news-card";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { dataBreve } from "@/src/lib/date";
import { getCorpoNews } from "@/src/lib/news/articolo";
import { getNewsPubblicata } from "@/src/lib/news/queries";

// Due forme nella stessa pagina:
//   - news di fonte: solo il corpo dell'articolo altrui, letto al volo dalle
//     API della fonte (niente iframe: il sito intero portava dentro cookie
//     banner e menu altrui) e non salvato a database. La fonte è sempre
//     citata e linkata.
//   - articolo nostro: corpo a blocchi dal nostro database, firma al posto
//     del rimando, e la nota che il testo è stato generato in parte con AI.
//
// Il segmento accetta sia lo slug (articoli nostri) sia l'uuid (news di
// fonte). Le bozze non arrivano qui: getNewsPubblicata filtra su published.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsPubblicata(id);
  if (!item) return {};
  return {
    title: item.title,
    description: item.excerpt ?? undefined,
    openGraph: {
      title: item.title,
      description: item.excerpt ?? undefined,
      type: "article",
      publishedTime: item.publishedAt.toISOString(),
      images: item.imageUrl ? [item.imageUrl] : undefined,
    },
  };
}

export default async function NewsLetturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getNewsPubblicata(id);
  if (!item) notFound();

  // Un solo indirizzo buono per gli articoli nostri: chi arriva dall'uuid
  // finisce sullo slug (link condivisi e motori di ricerca puntano lì).
  if (item.slug && id !== item.slug) redirect(`/news/${item.slug}`);

  const nostro = item.source === "redazione";
  const paragrafi = nostro ? null : await getCorpoNews(item);
  const fonte = nomeFonte[item.source] ?? item.source;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-2xl">
      <TornaIndietro fallback="/news" etichetta="News" />

      <article className="flex flex-col gap-4">
        <p className="eyebrow">
          <span className={fonteDiCasa(item.source) ? "font-bold !text-brand-vivid" : ""}>
            {fonte}
          </span>
          {item.category ? ` · ${item.category}` : ""} ·{" "}
          {dataBreve(item.publishedAt)}
        </p>

        <h1 className="display text-3xl">{item.title}</h1>

        {nostro && (
          <div className="flex flex-col gap-0.5">
            {item.authorName && (
              <p className="text-sm font-semibold">di {item.authorName}</p>
            )}
            {/* Dichiarato in chiaro, in piccolo: chi legge sa com'è nato il testo */}
            <p className="text-[11px] text-muted">Generato in parte con AI</p>
          </div>
        )}

        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt=""
            width={800}
            height={450}
            className="taglio w-full object-cover"
            priority
          />
        )}

        {nostro && item.body ? (
          <CorpoArticolo blocchi={item.body} />
        ) : paragrafi ? (
          <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
            {paragrafi.map((testo, i) => (
              <p key={i}>{testo}</p>
            ))}
          </div>
        ) : (
          // Corpo non disponibile (fonte giù o formato inatteso):
          // l'estratto e il link all'originale tengono la pagina utile.
          <div className="taglio-sm card flex flex-col gap-3 p-4">
            {item.excerpt && <p className="text-sm text-muted">{item.excerpt}</p>}
            <p className="text-sm text-muted">
              Il testo completo non è disponibile qui in questo momento.
            </p>
          </div>
        )}

        {/* La fonte si cita sempre, e il link è la scappatoia se il
            corpo non è arrivato. Un articolo nostro non ha nessun altrove:
            la fonte è questa pagina. */}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow self-start transition-colors hover:text-brand-vivid"
          >
            Fonte: {fonte} ↗
          </a>
        )}
      </article>
    </main>
  );
}
