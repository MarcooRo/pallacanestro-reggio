import type { Metadata } from "next";
import Link from "next/link";

import { PartitaCard } from "@/src/components/partita-card";
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
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-sm text-muted">Nessuna partita in archivio.</p>
      </main>
    );
  }

  const { s } = await searchParams;
  const richiesta = Number(s);
  const stagione = stagioni.includes(richiesta) ? richiesta : stagioni[0];
  const partite = await getCalendario(stagione);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Calendario</h1>

      <div className="flex gap-2">
        {stagioni.map((anno) => (
          <Link
            key={anno}
            href={`/calendario?s=${anno}`}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              anno === stagione
                ? "bg-brand text-on-brand"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {etichettaStagione(anno)}
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted">
        {partite.length} partite, dalla più recente
      </p>

      <div className="flex flex-col gap-3">
        {partite.map((p) => (
          <PartitaCard key={p.id} partita={p} />
        ))}
      </div>
    </main>
  );
}
