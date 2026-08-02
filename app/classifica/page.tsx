import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getClassificaCampionato } from "@/src/lib/classifica/campionato";
import { fotoUrl } from "@/src/lib/immagini";

export const metadata: Metadata = { title: "Classifica" };

// La classifica del campionato (quella di Serie A, non le pagelle:
// quelle vivono in /voto). Dati al volo dalla fonte, cache 30 minuti.
export default async function ClassificaPage() {
  const classifica = await getClassificaCampionato();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="display text-3xl">Classifica</h1>

      {!classifica ? (
        <p className="taglio-sm card p-4 text-sm text-muted">
          La classifica arriva con la prima giornata di campionato.
        </p>
      ) : (
        <>
          <p className="eyebrow">
            {classifica.competizione}
            {classifica.giornata ? ` · aggiornata alla ${classifica.giornata}` : ""}
          </p>

          <ol className="flex flex-col">
            {classifica.righe.map((r) => {
              const url = fotoUrl(r.logoKey, "thumb");
              return (
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
                  {url ? (
                    <Image
                      src={url}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                  ) : (
                    <span aria-hidden className="h-6 w-6 shrink-0" />
                  )}
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-tight ${
                      r.reggio ? "text-brand-vivid" : ""
                    }`}
                  >
                    {r.teamName}
                  </span>
                  <span className="eyebrow whitespace-nowrap">
                    {r.wins}V {r.defeats}S
                    {r.penaltyPoints > 0 ? ` · ${r.penaltyPoints} pen` : ""}
                  </span>
                  <span
                    className={`score w-8 text-right text-base font-bold ${
                      r.reggio ? "text-brand-vivid" : ""
                    }`}
                  >
                    {r.points}
                  </span>
                </Link>
                </li>
              );
            })}
          </ol>

          <p className="eyebrow">PT punti · V vinte · S perse</p>
        </>
      )}
    </main>
  );
}
