import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TornaIndietro } from "@/src/components/torna-indietro";
import { getNewsById } from "@/src/lib/news/queries";

// Lettura in-app: l'articolo si apre in un iframe sulla pagina originale.
// Niente ripubblicazione (il confine di PROJECT_RE.md sezione 6 resta):
// è il sito della fonte che si renderizza da sé, con le sue pubblicità e
// i suoi contatori. Entrambe le fonti oggi non mandano X-Frame-Options
// né frame-ancestors; se un giorno bloccassero, resta "Apri sul sito".

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

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <TornaIndietro fallback="/news" etichetta="News" />
        {/* Scappatoia sempre visibile: se la fonte smette di farsi
            incorniciare, l'articolo resta raggiungibile */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="eyebrow shrink-0 transition-colors hover:text-brand-vivid"
        >
          Apri sul sito ↗
        </a>
      </div>

      {/* Sandbox senza allow-top-navigation: i link dentro l'articolo
          navigano nel riquadro, non portano via l'app */}
      <iframe
        src={item.url}
        title={item.title}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        className="taglio-sm min-h-[75dvh] w-full flex-1 border border-border bg-surface"
      />
    </main>
  );
}
