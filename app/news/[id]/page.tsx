import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { nomeFonte } from "@/src/components/news-card";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { dataBreve } from "@/src/lib/date";
import { getCorpoNews } from "@/src/lib/news/articolo";
import { getNewsById } from "@/src/lib/news/queries";

// Lettura in-app: solo il corpo dell'articolo, impaginato col design
// dell'app. Il testo arriva al volo dalle API delle fonti (niente
// iframe: il sito intero portava dentro cookie banner e menu altrui) e
// non si salva a database. La fonte è sempre citata e linkata.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const item = await getNewsById(id);
  return item ? { title: item.title } : {};
}

export default async function NewsLetturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Il cast a uuid di Postgres esplode sugli id malformati: prima il 404.
  if (!UUID.test(id)) notFound();
  const item = await getNewsById(id);
  if (!item) notFound();

  const paragrafi = await getCorpoNews(item);
  const fonte = nomeFonte[item.source] ?? item.source;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <TornaIndietro fallback="/news" etichetta="News" />

      <article className="flex flex-col gap-4">
        <p className="eyebrow">
          <span
            className={
              item.source === "pr_wordpress" ? "font-bold !text-brand-vivid" : ""
            }
          >
            {fonte}
          </span>
          {item.category ? ` · ${item.category}` : ""} ·{" "}
          {dataBreve(item.publishedAt)}
        </p>

        <h1 className="display text-3xl">{item.title}</h1>

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

        {paragrafi ? (
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
            corpo non è arrivato */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="eyebrow self-start transition-colors hover:text-brand-vivid"
        >
          Fonte: {fonte} ↗
        </a>
      </article>
    </main>
  );
}
