import type { Metadata } from "next";
import Link from "next/link";

import { LogoClub } from "@/src/components/logo-club";
import { SelettoreStagione } from "@/src/components/selettore-stagione";
import {
  getClassificaCampionato,
  getStagioniClassifica,
  stagioneHaClassifica,
} from "@/src/lib/classifica/campionato";
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
  const [classifica, stagioni] = await Promise.all([
    getClassificaCampionato(stagione),
    getStagioniClassifica(),
  ]);

  // La stagione da scrivere in grande: quella mostrata, o quella chiesta
  // (anche se vuota), o la più recente in archivio.
  const attiva = classifica?.seasonYear ?? stagione ?? stagioni.at(0);

  // Se in pagina c'è una stagione vecchia va detto in faccia, non lasciato
  // dedurre dall'etichetta: d'estate la "classifica" è quella dell'anno
  // scorso e senza avviso si legge come la corrente.
  const ultima = stagioni.at(0);
  const stagioneVecchia =
    classifica !== null && ultima !== undefined && classifica.seasonYear < ultima;
  const ultimaIniziata = stagioneVecchia
    ? await stagioneHaClassifica(ultima)
    : true;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6 lg:max-w-3xl">
      {/* L'anno sta nel titolo, non in un occhiello: è la prima cosa da
          sapere davanti a una classifica. La tendina a destra cambia
          stagione, come nel calendario. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl">
          Classifica{" "}
          {attiva !== undefined && (
            <span className="text-brand-vivid">{etichettaStagione(attiva)}</span>
          )}
        </h1>
        {stagioni.length > 1 && (
          <SelettoreStagione
            attiva={String(attiva)}
            opzioni={stagioni.map((anno) => ({
              valore: String(anno),
              etichetta: etichettaStagione(anno),
              href: `/classifica?s=${anno}`,
            }))}
          />
        )}
      </div>

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
          {stagioneVecchia && (
            <div className="taglio-sm card border-l-2 border-l-brand-vivid p-4 text-sm">
              {ultimaIniziata ? (
                <>Stagione conclusa: questa è la classifica finale.</>
              ) : (
                <>
                  Il campionato {etichettaStagione(ultima!)} non è ancora
                  iniziato: questa è la classifica finale della stagione{" "}
                  {etichettaStagione(classifica.seasonYear)}.
                </>
              )}
            </div>
          )}

          <p className="eyebrow">
            {classifica.competizione}
            {classifica.giornata ? ` · aggiornata alla ${classifica.giornata}` : ""}
          </p>

          <div className="flex flex-col">
            {/* Intestazione delle colonne, solo dove le righe sono su una
                riga sola: stesse larghezze e stessi gap delle righe sotto,
                così i numeri cascano a piombo. */}
            <div className="hidden items-center gap-3 border-b border-border py-1.5 pl-1 pr-2 sm:flex">
              <span className="w-6" />
              <span className="w-8" />
              <span className="min-w-0 flex-1" />
              <span className="eyebrow w-9 text-right">V</span>
              <span className="eyebrow w-9 text-right">S</span>
              <span className="eyebrow w-12 text-right">+/−</span>
              <span className="eyebrow w-9 text-right">PT</span>
            </div>

            <ol className="flex flex-col">
              {classifica.righe.map((r) => {
                const diff = r.pointsMade - r.pointsSuffered;
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
                      <LogoClub logoKey={r.logoKey} misura="sm" />
                      {/* Sul telefono nome e numeri si incolonnano: sulla
                          stessa riga metà squadre finivano in "VIRTUS OLIDATA
                          BOLO…". Le larghezze fisse tengono i numeri in
                          colonna anche impilati. */}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                        <span
                          className={`min-w-0 flex-1 text-sm font-bold uppercase leading-tight tracking-tight ${
                            r.reggio ? "text-brand-vivid" : ""
                          }`}
                        >
                          {r.teamName}
                          {r.penaltyPoints > 0 && (
                            <span className="eyebrow ml-2 normal-case">
                              −{r.penaltyPoints} pen
                            </span>
                          )}
                        </span>
                        {/* Le lettere V/S servono solo dove non c'è
                            l'intestazione delle colonne */}
                        <span className="score flex items-center gap-3 whitespace-nowrap text-sm">
                          <span className="w-9 text-right font-bold">
                            {r.wins}
                            <span className="text-muted sm:hidden">V</span>
                          </span>
                          <span className="w-9 text-right text-muted">
                            {r.defeats}
                            <span className="sm:hidden">S</span>
                          </span>
                          <span
                            className={`w-12 text-right ${
                              diff > 0 ? "text-brand-vivid" : "text-muted"
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </span>
                      </div>
                      <span
                        className={`score w-9 text-right text-base font-bold ${
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
          </div>

          <p className="eyebrow">
            V vinte · S perse · +/− punti fatti meno subiti · PT punti in
            classifica
          </p>
        </>
      )}
    </main>
  );
}
