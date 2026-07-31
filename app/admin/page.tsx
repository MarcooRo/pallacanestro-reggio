import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  aggiornaPartita,
  apriVotazione,
  chiudiEPubblicaPagella,
} from "@/src/lib/admin/actions";
import { getProfilo } from "@/src/lib/auth/session";
import { dataOra } from "@/src/lib/date";
import { getPartiteClubCasa, type PartitaLista } from "@/src/lib/partite/queries";
import { ORE_FINESTRA_DEFAULT } from "@/src/lib/voto/regole";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string }>;
}) {
  // Autorizzazione nella pagina E in ogni action. Mai nel proxy.
  const profilo = await getProfilo();
  if (!profilo || profilo.role !== "admin") redirect("/");

  const { esito } = await searchParams;
  const partite = await getPartiteClubCasa();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Admin · Partite</h1>
      <p className="text-sm text-muted">
        Le partite del club, dalla più recente. Apertura voto, chiusura con
        pubblicazione della pagella, correzione del risultato.
      </p>

      {esito && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">
          {esito}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {partite.map((p) => (
          <RigaAdmin key={p.id} partita={p} />
        ))}
      </div>
    </main>
  );
}

const etichettaStato: Record<string, string> = {
  closed: "voto chiuso",
  open: "VOTO APERTO",
  tallied: "pagella pubblicata",
};

function RigaAdmin({ partita }: { partita: PartitaLista }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
        <span>
          {partita.competitionName}
          {partita.dayName ? ` · ${partita.dayName}` : ""}
        </span>
        <span>{dataOra(partita.startsAt)}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href={`/partite/${partita.id}`} className="font-semibold hover:text-brand">
          {partita.homeTeam} – {partita.awayTeam}
        </Link>
        <span className="text-sm font-bold tabular-nums">
          {partita.homeScore ?? "–"} : {partita.awayScore ?? "–"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            partita.votingState === "open"
              ? "bg-brand text-on-brand"
              : "bg-surface text-muted"
          }`}
        >
          {etichettaStato[partita.votingState]}
        </span>

        {partita.votingState === "closed" && (
          <form action={apriVotazione} className="flex items-center gap-2">
            <input type="hidden" name="matchId" value={partita.id} />
            <label className="text-xs text-muted" htmlFor={`ore-${partita.id}`}>
              ore
            </label>
            <input
              id={`ore-${partita.id}`}
              name="ore"
              type="number"
              defaultValue={ORE_FINESTRA_DEFAULT}
              min={1}
              max={96}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-on-brand hover:bg-brand-hover"
            >
              Apri voto
            </button>
          </form>
        )}

        {partita.votingState === "open" && (
          <form action={chiudiEPubblicaPagella}>
            <input type="hidden" name="matchId" value={partita.id} />
            <button
              type="submit"
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-on-brand hover:bg-brand-hover"
            >
              Chiudi e pubblica pagella
            </button>
          </form>
        )}
      </div>

      <details>
        <summary className="cursor-pointer text-xs text-muted">
          Correggi risultato
        </summary>
        <form action={aggiornaPartita} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="matchId" value={partita.id} />
          <input
            name="homeScore"
            type="number"
            min={0}
            defaultValue={partita.homeScore ?? ""}
            placeholder="casa"
            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            name="awayScore"
            type="number"
            min={0}
            defaultValue={partita.awayScore ?? ""}
            placeholder="ospiti"
            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <select
            name="status"
            defaultValue={partita.status}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="scheduled">in programma</option>
            <option value="live">in corso</option>
            <option value="finished">finita</option>
            <option value="postponed">rinviata</option>
            <option value="cancelled">annullata</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface"
          >
            Salva
          </button>
        </form>
      </details>
    </div>
  );
}
