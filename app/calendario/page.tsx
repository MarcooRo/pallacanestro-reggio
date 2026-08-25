import type { Metadata } from "next";
import Link from "next/link";

import { PartitaCard } from "@/src/components/partita-card";
import { Pillola } from "@/src/components/pillola";
import { SelettoreStagione } from "@/src/components/selettore-stagione";
import { stagioneHaClassifica } from "@/src/lib/classifica/campionato";
import { etichettaStagione } from "@/src/lib/date";
import { contestoPartita } from "@/src/lib/partite/etichette";
import {
  getCalendario,
  getStagioni,
  haPartiteDaGiocare,
  type PartitaLista,
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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-5xl">
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

  // Le partite si leggono a giornate: gruppi consecutivi con la stessa
  // etichetta (giornata o fase). Consecutivi e non per chiave assoluta:
  // l'ordine "prima le prossime" può spezzare una giornata a metà tra
  // giocate e da giocare, e i due pezzi restano dove il lettore li cerca.
  const giornate: { etichetta: string; partite: PartitaLista[] }[] = [];
  for (const p of partite) {
    const etichetta = contestoPartita(p);
    const ultima = giornate.at(-1);
    if (ultima && ultima.etichetta === etichetta) ultima.partite.push(p);
    else giornate.push({ etichetta, partite: [p] });
  }

  const url = (patch: { s?: number; f?: string }) => {
    const query = new URLSearchParams();
    query.set("s", String(patch.s ?? stagione));
    const filtro = "f" in patch ? patch.f : f;
    if (filtro === "tutte") query.set("f", "tutte");
    return `/calendario?${query.toString()}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-5xl">
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

      {/* Una sezione per giornata, con l'etichetta una volta sola in testa
          e le card senza contesto. Su desktop due colonne: si legge riga
          per riga, la cronologia scorre in orizzontale prima di andare a
          capo. La chiave porta l'indice: la stessa etichetta può tornare
          (andata/ritorno, giornata spezzata). */}
      <div className="flex flex-col gap-7">
        {giornate.map((g, i) => (
          <section key={`${g.etichetta}-${i}`} className="flex flex-col gap-2.5">
            <h2 className="eyebrow border-b border-border pb-1.5">
              {g.etichetta}
            </h2>
            <div className="grid gap-2.5 lg:grid-cols-2">
              {g.partite.map((p) => (
                <PartitaCard key={p.id} partita={p} senzaContesto />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
