import type { Metadata } from "next";
import Link from "next/link";

import { AvatarGiocatore } from "@/src/components/avatar-giocatore";
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
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold">Giocatori</h1>
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
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
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Giocatori</h1>

      <div className="flex gap-2">
        {stagioni.map((anno) => (
          <Link
            key={anno}
            href={`/giocatori?s=${anno}`}
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

      <ul className="flex flex-col gap-2">
        {roster.map((g) => (
          <li key={`${g.id}-${g.startDate}`}>
            <Link
              href={`/giocatori/${g.id}`}
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-brand"
            >
              <span className="w-7 text-center text-lg font-bold tabular-nums text-brand">
                {g.jerseyNumber ?? "–"}
              </span>
              <AvatarGiocatore
                firstName={g.firstName}
                lastName={g.lastName}
                photoKey={g.photoKey}
                dimensione={44}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">
                  {g.firstName} {g.lastName}
                </span>
                <span className="text-xs text-muted">
                  {[g.role, g.nationality].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
