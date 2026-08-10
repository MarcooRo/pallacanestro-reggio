import type { Metadata } from "next";
import Link from "next/link";

import { ClassificheSezione } from "@/src/components/classifiche-sezione";
import { Pagella } from "@/src/components/pagella";
import { PartitaCard } from "@/src/components/partita-card";
import {
  getUltimaPagella,
  getVotazioneAperta,
} from "@/src/lib/partite/queries";

export const metadata: Metadata = { title: "Voto" };

// La casa del voto: votazione aperta, ultima pagella e classifiche
// in un'unica pagina. /classifiche reindirizza qui.
export default async function VotoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [votazione, ultima] = await Promise.all([
    getVotazioneAperta(),
    getUltimaPagella(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 px-4 py-6 lg:max-w-2xl [&>section]:py-5 [&>section+section]:border-t [&>section+section]:border-border">
      <h1 className="display pb-1 text-3xl">Voto</h1>

      <section className="flex flex-col gap-3">
        {votazione ? (
          <>
            <h2 className="display text-2xl text-brand-vivid">Si vota, ora</h2>
            <PartitaCard partita={votazione} />
            <Link
              href={`/partite/${votazione.id}`}
              className="taglio display bg-brand px-4 py-3.5 text-center text-xl text-on-brand transition-colors hover:bg-brand-hover"
            >
              Vota il migliore
            </Link>
          </>
        ) : (
          <p className="taglio-sm card p-4 text-sm text-muted">
            Nessuna votazione aperta ora: si vota il migliore in campo a fine
            partita, dalla sirena per 48 ore.
          </p>
        )}
      </section>

      {/* Mentre si vota il verdetto scorso sparisce: prima il presente */}
      {!votazione && ultima && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">L&apos;ultima pagella</h2>
            <Link
              href={`/partite/${ultima.partita.id}`}
              className="eyebrow text-brand-vivid"
            >
              tutta →
            </Link>
          </div>
          <p className="eyebrow">
            {ultima.partita.homeTeam} – {ultima.partita.awayTeam}
            {ultima.partita.status === "finished"
              ? ` · ${ultima.partita.homeScore}-${ultima.partita.awayScore}`
              : ""}
          </p>
          <Pagella righe={ultima.pagella} compatta />
        </section>
      )}

      <ClassificheSezione sp={sp} />
    </main>
  );
}
