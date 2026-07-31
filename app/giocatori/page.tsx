import type { Metadata } from "next";
import Link from "next/link";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
import { Pillola } from "@/src/components/pillola";
import { etichettaStagione } from "@/src/lib/date";
import { getRosterStagione, getStagioniRoster } from "@/src/lib/giocatori/queries";

export const metadata: Metadata = { title: "Giocatori" };

export default async function GiocatoriPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const stagioni = await getStagioniRoster();
  if (stagioni.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="display text-3xl">La squadra</h1>
        <p className="taglio-sm border border-border bg-surface p-4 text-sm text-muted">
          Il roster non è ancora disponibile: la fonte non l&apos;ha pubblicato.
        </p>
      </main>
    );
  }

  const { s } = await searchParams;
  const richiesta = Number(s);
  const stagione = stagioni.includes(richiesta) ? richiesta : stagioni[0];

  const roster = (await getRosterStagione(stagione)).sort(
    (a, b) => Number(a.jerseyNumber ?? 999) - Number(b.jerseyNumber ?? 999),
  );

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">La squadra</h1>

      <div className="flex gap-2.5 pl-1">
        {stagioni.map((anno) => (
          <Pillola key={anno} href={`/giocatori?s=${anno}`} attiva={anno === stagione}>
            {etichettaStagione(anno)}
          </Pillola>
        ))}
      </div>

      <ul className="flex flex-col">
        {roster.map((g) => (
          <li key={`${g.id}-${g.startDate}`}>
            <Link
              href={`/giocatori/${g.id}`}
              className="group flex items-center gap-3 border-b border-border py-3 transition-colors hover:bg-surface"
            >
              <span className="display w-10 text-center text-2xl text-brand transition-colors group-hover:text-brand-vivid">
                {g.jerseyNumber ?? "–"}
              </span>
              <AvatarGiocatore
                firstName={g.firstName}
                lastName={g.lastName}
                photoKey={g.photoKey}
                dimensione={44}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-bold uppercase tracking-tight">
                  {g.firstName} {g.lastName}
                </span>
                <span className="eyebrow mt-0.5">
                  {[g.role, g.nationality].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span aria-hidden className="pr-2 text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand-vivid">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
