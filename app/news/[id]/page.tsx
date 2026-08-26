import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { branding } from "@/src/branding";
import { Condividi } from "@/src/components/condividi";
import { CorpoArticolo } from "@/src/components/corpo-articolo";
import {
  descrizioneFonte,
  fonteDiCasa,
  nomeFonte,
} from "@/src/lib/news/etichette";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { dataBreve } from "@/src/lib/date";
import { getCorpoNews } from "@/src/lib/news/articolo";
import { risolviGrafici } from "@/src/lib/news/grafici/dati";
import {
  risolviImmaginiCorpo,
  urlImmaginiCorpo,
} from "@/src/lib/news/immagini";
import { getNewsPubblicata } from "@/src/lib/news/queries";
import { urlSito } from "@/src/lib/sito";

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
  // Canonical sullo slug quando c'è (articoli nostri): un solo indirizzo
  // buono anche se il link girato è quello con l'uuid.
  const indirizzo = `/news/${item.slug ?? item.id}`;

  // Senza copertina, per la condivisione vale la prima foto del corpo:
  // meglio una scheda con immagine che una scheda nuda.
  let anteprima = item.imageUrl;
  if (!anteprima && item.body) {
    const immagini = await risolviImmaginiCorpo(item.body);
    anteprima = urlImmaginiCorpo(item.body, immagini)[0] ?? null;
  }

  return {
    title: item.title,
    description: item.excerpt ?? undefined,
    alternates: { canonical: indirizzo },
    openGraph: {
      title: item.title,
      description: item.excerpt ?? undefined,
      type: "article",
      url: indirizzo,
      publishedTime: item.publishedAt.toISOString(),
      modifiedTime: item.updatedAt.toISOString(),
      images: anteprima ? [anteprima] : undefined,
    },
  };
}

// Dati strutturati, solo per gli articoli nostri: sulle news di fonte
// sarebbe una dichiarazione falsa (il testo non è nostro).
// Il JSON viene da un oggetto costruito qui, non da input esterno; l'unica
// insidia sono i "<" dentro i testi, che chiuderebbero il tag script.
function DatiStrutturati({
  articolo,
  url,
  immaginiCorpo,
}: {
  articolo: NonNullable<Awaited<ReturnType<typeof getNewsPubblicata>>>;
  url: string;
  immaginiCorpo: string[];
}) {
  // Copertina e foto del corpo: Google preferisce più immagini per articolo
  const immagini = [
    ...(articolo.imageUrl ? [articolo.imageUrl] : []),
    ...immaginiCorpo,
  ];
  const dati = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: articolo.title.slice(0, 110),
    description: articolo.excerpt ?? undefined,
    image: immagini.length > 0 ? immagini : undefined,
    datePublished: articolo.publishedAt.toISOString(),
    dateModified: articolo.updatedAt.toISOString(),
    author: articolo.authorName
      ? { "@type": "Person", name: articolo.authorName }
      : { "@type": "Organization", name: "Redazione" },
    publisher: { "@type": "Organization", name: branding.appName, url: urlSito() },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "it-IT",
    isAccessibleForFree: true,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dati).replaceAll("<", "\\u003c"),
      }}
    />
  );
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
  // L'indirizzo canonico (slug quando c'è): è quello che si condivide
  // e che finisce nei dati strutturati — un solo link in giro.
  const canonical = `${urlSito()}/news/${item.slug ?? item.id}`;
  // Le foto dentro il corpo: il blocco porta l'id, url e misure stanno in
  // libreria (misure vere = nessun salto di layout mentre carica).
  const immagini = nostro ? await risolviImmaginiCorpo(item.body) : {};
  // I widget: il blocco porta il riferimento, il dato si legge adesso —
  // così un tabellino corretto dopo la pubblicazione si aggiorna da solo.
  const grafici = nostro ? await risolviGrafici(item.body) : {};

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-2xl">
      {nostro && (
        <DatiStrutturati
          articolo={item}
          url={canonical}
          immaginiCorpo={urlImmaginiCorpo(item.body, immagini)}
        />
      )}
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

        {nostro ? (
          item.authorName && (
            <p className="text-sm font-semibold">di {item.authorName}</p>
          )
        ) : (
          // Il testo non è nostro e va detto subito, non solo in fondo:
          // stessa posizione della firma sugli articoli di redazione.
          <p className="text-sm text-muted">
            Articolo {descrizioneFonte[item.source] ?? `da ${fonte}`}
          </p>
        )}

        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            // La caption scritta in libreria dice cosa si vede; se manca
            // l'immagine resta decorativa (alt vuoto) invece di mentire.
            alt={item.copertinaCaption ?? ""}
            width={800}
            height={450}
            className="taglio w-full object-cover"
            priority
          />
        )}

        {/* Condividi anche qui, prima del corpo: chi gira il link spesso
            non arriva in fondo. In fondo c'è il gemello per chi ha letto. */}
        <Condividi url={canonical} titolo={item.title} />

        {nostro && item.body ? (
          <CorpoArticolo blocchi={item.body} immagini={immagini} grafici={grafici} />
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

        <Condividi url={canonical} titolo={item.title} />

        {/* La fonte si cita sempre, per esteso, e il link all'originale
            è la scappatoia se il corpo non è arrivato. Un articolo
            nostro non ha nessun altrove: la fonte è questa pagina. */}
        {!nostro && (
          <div className="taglio-sm card flex flex-col gap-1.5 p-4">
            <p className="eyebrow">Fonte</p>
            <p className="text-sm text-muted">
              Questo articolo arriva{" "}
              {descrizioneFonte[item.source] ?? `da ${fonte}`}: il testo è
              di <span className="font-semibold text-foreground">{fonte}</span>,
              riportato qui integralmente.
            </p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow self-start text-brand-vivid transition-colors hover:text-foreground"
              >
                leggi l&apos;originale su {fonte} ↗
              </a>
            )}
          </div>
        )}

        {/* Dichiarato in chiaro, in chiusura: chi legge sa com'è nato
            il testo. Sta in fondo per non pesare sull'attacco. */}
        {nostro && (
          <p className="text-[11px] text-muted">Generato in parte con AI</p>
        )}
      </article>
    </main>
  );
}
