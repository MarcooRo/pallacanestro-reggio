import type { Metadata } from "next";
import Link from "next/link";

import { LogoClub } from "@/src/components/logo-club";
import { getClassificaCampionato } from "@/src/lib/classifica/campionato";
import { etichettaStagione } from "@/src/lib/date";

export const metadata: Metadata = { title: "Classifica" };

// La classifica del campionato (quella di Serie A, non le pagelle:
// quelle vivono in /voto). Dati al volo dalla fonte, cache 30 minuti.
// Con `?s=` si chiede una stagione precisa (il calendario passa la sua);
// senza, si mostra la più recente che abbia dati.
export default async function ClassificaPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const richiesta = Number(s);
  const stagione = Number.isInteger(richiesta) ? richiesta : undefined;
  const classifica = await getClassificaCampionato(stagione);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-3xl">
      <h1 className="display text-3xl">Classifica</h1>

      {!classifica ? (
        <div className="taglio-sm card flex flex-col gap-3 p-4">
          <p className="text-sm text-muted">
            La classifica
            {stagione ? ` ${etichettaStagione(stagione)}` : ""} arriva con la
            prima giornata di campionato.
          </p>
          {stagione && (
            <Link href="/classifica" className="eyebrow text-brand-vivid">
              l&apos;ultima disponibile →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* La stagione va detta sempre: la fonte pubblica solo l'ultima
              giornata giocata e senza etichetta si legge come "oggi" */}
          <p className="eyebrow">
            {etichettaStagione(classifica.seasonYear)} · {classifica.competizione}
            {classifica.giornata ? ` · aggiornata alla ${classifica.giornata}` : ""}
          </p>

          <ol className="flex flex-col">
            {classifica.righe.map((r) => (
                <li key={r.lbaTeamId} className="border-b border-border last:border-b-0">
                <Link
                  href={r.reggio ? "/giocatori" : `/squadre/${r.lbaTeamId}`}
                  className={`flex items-center gap-3 py-2.5 pl-1 pr-2 transition-colors hover:bg-surface ${
                    r.reggio ? "border-l-2 border-l-brand-vivid bg-brand-tint" : ""
                  }`}
                >
                  <span
                    className={`score w-6 text-center text-sm ${
                      r.reggio ? "font-bold text-brand-vivid" : "text-muted"
                    }`}
                  >
                    {r.position}
                  </span>
                  <LogoClub logoKey={r.logoKey} misura="sm" />
                  {/* Sul telefono nome e record si incolonnano: sulla stessa
                      riga metà squadre finivano in "VIRTUS OLIDATA BOLO…" */}
                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
                    <span
                      className={`min-w-0 flex-1 text-sm font-bold uppercase leading-tight tracking-tight ${
                        r.reggio ? "text-brand-vivid" : ""
                      }`}
                    >
                      {r.teamName}
                    </span>
                    <span className="eyebrow whitespace-nowrap">
                      {r.wins}V {r.defeats}S
                      {r.penaltyPoints > 0 ? ` · ${r.penaltyPoints} pen` : ""}
                    </span>
                  </div>
                  <span
                    className={`score w-8 text-right text-base font-bold ${
                      r.reggio ? "text-brand-vivid" : ""
                    }`}
                  >
                    {r.points}
                  </span>
                </Link>
                </li>
            ))}
          </ol>

          <p className="eyebrow">PT punti · V vinte · S perse</p>
        </>
      )}
    </main>
  );
}
