import type { Metadata } from "next";

import { PartitaCard } from "@/src/components/partita-card";
import { Pillola } from "@/src/components/pillola";
import { etichettaStagione } from "@/src/lib/date";
import { getCalendario, getStagioni } from "@/src/lib/partite/queries";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const stagioni = await getStagioni();
  if (stagioni.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="display text-3xl">Partite</h1>
        <p className="text-sm text-muted">Nessuna partita in archivio.</p>
      </main>
    );
  }

  const { s } = await searchParams;
  const richiesta = Number(s);
  const stagione = stagioni.includes(richiesta) ? richiesta : stagioni[0];
  const partite = await getCalendario(stagione);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">Partite</h1>

      <div className="flex gap-2.5 pl-1">
        {stagioni.map((anno) => (
          <Pillola key={anno} href={`/calendario?s=${anno}`} attiva={anno === stagione}>
            {etichettaStagione(anno)}
          </Pillola>
        ))}
      </div>

      <p className="eyebrow">{partite.length} partite · dalla più recente</p>

      <div className="flex flex-col gap-2.5">
        {partite.map((p) => (
          <PartitaCard key={p.id} partita={p} />
        ))}
      </div>
    </main>
  );
}
