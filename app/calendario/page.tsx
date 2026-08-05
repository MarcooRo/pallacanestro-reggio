import type { Metadata } from "next";
import Link from "next/link";

import { PartitaCard } from "@/src/components/partita-card";
import { Pillola } from "@/src/components/pillola";
import { SelettoreStagione } from "@/src/components/selettore-stagione";
import { stagioneHaClassifica } from "@/src/lib/classifica/campionato";
import { etichettaStagione } from "@/src/lib/date";
import {
  getCalendario,
  getStagioni,
  haPartiteDaGiocare,
} from "@/src/lib/partite/queries";

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
  // "Solo Reggio" è il default: chi apre il calendario cerca le partite
  // della Pallacanestro Reggiana, il resto del girone è il caso raro.
  // I vecchi link con f=reggio restano validi (qualsiasi cosa ≠ "tutte").
  const soloReggio = f !== "tutte";
  const [partite, haClassifica] = await Promise.all([
    getCalendario(stagione, soloReggio),
    stagioneHaClassifica(stagione),
  ]);

  const url = (patch: { s?: number; f?: string }) => {
    const query = new URLSearchParams();
    query.set("s", String(patch.s ?? stagione));
    const filtro = "f" in patch ? patch.f : f;
    if (filtro === "tutte") query.set("f", "tutte");
    return `/calendario?${query.toString()}`;
  };

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      {/* La stagione vive sulla riga del titolo come tendina: le pillole
          degli anni su schermi stretti mandavano a capo "Solo Reggio" */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl">Partite</h1>
        {stagioni.length > 1 ? (
          <SelettoreStagione
            attiva={String(stagione)}
            opzioni={stagioni.map((anno) => ({
              valore: String(anno),
              etichetta: etichettaStagione(anno),
              href: url({ s: anno }),
            }))}
          />
        ) : (
          <span className="eyebrow">{etichettaStagione(stagione)}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5 pl-1">
        <Pillola href={url({ f: undefined })} attiva={soloReggio}>
          Solo Reggio
        </Pillola>
        <Pillola href={url({ f: "tutte" })} attiva={!soloReggio}>
          Tutte
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

      <p className="eyebrow">
        {partite.length} partite ·{" "}
        {haPartiteDaGiocare(partite) ? "prima le prossime" : "dalla più recente"}
      </p>

      <div className="flex flex-col gap-2.5">
        {partite.map((p) => (
          <PartitaCard key={p.id} partita={p} />
        ))}
      </div>
    </main>
  );
}
