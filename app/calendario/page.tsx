import type { Metadata } from "next";
import Link from "next/link";

import { PartitaCard } from "@/src/components/partita-card";
import { Pillola } from "@/src/components/pillola";
import { stagioneHaClassifica } from "@/src/lib/classifica/campionato";
import { etichettaStagione } from "@/src/lib/date";
import { getCalendario, getStagioni } from "@/src/lib/partite/queries";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; f?: string }>;
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

  const { s, f } = await searchParams;
  const richiesta = Number(s);
  const stagione = stagioni.includes(richiesta) ? richiesta : stagioni[0];
  const soloReggio = f === "reggio";
  const [partite, haClassifica] = await Promise.all([
    getCalendario(stagione, soloReggio),
    stagioneHaClassifica(stagione),
  ]);

  const url = (patch: { s?: number; f?: string }) => {
    const query = new URLSearchParams();
    query.set("s", String(patch.s ?? stagione));
    const filtro = "f" in patch ? patch.f : f;
    if (filtro) query.set("f", filtro);
    return `/calendario?${query.toString()}`;
  };

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">Partite</h1>

      <div className="flex flex-wrap gap-2.5 pl-1">
        {stagioni.map((anno) => (
          <Pillola key={anno} href={url({ s: anno })} attiva={anno === stagione}>
            {etichettaStagione(anno)}
          </Pillola>
        ))}
        <span aria-hidden className="mx-1 w-px bg-border" />
        <Pillola href={url({ f: undefined })} attiva={!soloReggio}>
          Tutte
        </Pillola>
        <Pillola href={url({ f: "reggio" })} attiva={soloReggio}>
          Solo Reggio
        </Pillola>
      </div>

      {/* CTA classifica: il calendario è dove uno si chiede "come siamo
          messi". Porta la stagione scelta e sparisce se quella stagione non
          ha ancora una classifica — altrimenti si finiva su quella di
          un'altra annata senza accorgersene. */}
      {haClassifica && (
        <Link
          href={`/classifica?s=${stagione}`}
          className="taglio-sm card flex items-baseline justify-between px-4 py-3 transition-colors hover:border-brand"
        >
          <span className="display text-lg">Classifica</span>
          <span className="eyebrow text-brand-vivid">vedi →</span>
        </Link>
      )}

      <p className="eyebrow">{partite.length} partite · dalla più recente</p>

      <div className="flex flex-col gap-2.5">
        {partite.map((p) => (
          <PartitaCard key={p.id} partita={p} />
        ))}
      </div>
    </main>
  );
}
