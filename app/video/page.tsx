import type { Metadata } from "next";

import { Pillola } from "@/src/components/pillola";
import { VideoCard } from "@/src/components/video-card";
import { getVideo, type FonteVideo } from "@/src/lib/video/queries";

export const metadata: Metadata = { title: "Video" };

// Come le news: tutto mescolato di default, i tag scelgono il canale.
const FILTRI: { chiave: string; etichetta: string; fonte?: FonteVideo }[] = [
  { chiave: "tutti", etichetta: "Tutti" },
  { chiave: "reggio", etichetta: "Reggio", fonte: "pr_youtube" },
  { chiave: "seriea", etichetta: "Serie A", fonte: "lba" },
];

export default async function VideoPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const attivo = FILTRI.find((x) => x.chiave === f) ?? FILTRI[0];
  const items = await getVideo(attivo.fonte);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">Video</h1>

      <div className="flex gap-2.5 pl-1">
        {FILTRI.map((filtro) => (
          <Pillola
            key={filtro.chiave}
            href={`/video?f=${filtro.chiave}`}
            attiva={filtro.chiave === attivo.chiave}
          >
            {filtro.etichetta}
          </Pillola>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="taglio-sm card p-4 text-sm text-muted">
          Nessun video disponibile ora: YouTube non risponde, riprova tra poco.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((v) => (
            <VideoCard key={v.videoId} video={v} />
          ))}
        </div>
      )}
    </main>
  );
}
