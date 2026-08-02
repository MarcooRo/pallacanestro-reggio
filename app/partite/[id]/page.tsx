import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormVoto } from "@/src/components/form-voto";
import { Pagella } from "@/src/components/pagella";
import { MiglioriPartita } from "@/src/components/migliori-partita";
import { Tabellino } from "@/src/components/tabellino";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { dataOra, soloOra } from "@/src/lib/date";
import {
  getPagella,
  getPartita,
  getTabellinoPartita,
  getVotabili,
  haVotato,
} from "@/src/lib/partite/queries";
import { finestraAperta } from "@/src/lib/voto/regole";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const partita = await getPartita((await params).id);
  if (!partita) return {};
  const titolo = `${partita.homeTeam} - ${partita.awayTeam}`;
  return {
    title:
      partita.votingState === "tallied" ? `La pagella di ${titolo}` : titolo,
  };
}

export default async function PartitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partita = await getPartita(id);
  if (!partita) notFound();

  const votazioneAperta = finestraAperta(partita, new Date());
  const giocata = partita.status === "finished";

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-6">
      <TornaIndietro fallback="/calendario" etichetta="Partite" />

      {/* Scoreboard */}
      <header className="-mt-4 flex flex-col gap-3">
        <p className="eyebrow">
          {partita.competitionName}
          {partita.dayName ? ` · ${partita.dayName}` : ""} ·{" "}
          {dataOra(partita.startsAt)}
        </p>

        <div className="taglio flex flex-col gap-2 card p-4">
          {[
            { squadra: partita.homeTeam, punti: partita.homeScore },
            { squadra: partita.awayTeam, punti: partita.awayScore },
          ].map(({ squadra, punti }, i) => {
            const vince =
              giocata &&
              partita.homeScore !== null &&
              partita.awayScore !== null &&
              (i === 0
                ? partita.homeScore > partita.awayScore
                : partita.awayScore > partita.homeScore);
            return (
              <div key={squadra} className="flex items-center justify-between gap-3">
                <span
                  className={`display min-w-0 truncate text-xl ${
                    giocata && !vince ? "text-muted" : ""
                  }`}
                >
                  {squadra}
                </span>
                {giocata && (
                  <span
                    className={`score text-3xl font-bold ${
                      vince ? "text-brand-vivid" : "text-muted"
                    }`}
                  >
                    {punti}
                  </span>
                )}
              </div>
            );
          })}
          <Parziali quarterScores={partita.quarterScores} />
        </div>

        {(partita.venueName || partita.referees?.length) && (
          <p className="text-xs text-muted">
            {partita.venueName}
            {partita.townName ? `, ${partita.townName}` : ""}
            {partita.referees?.length
              ? ` · Arbitri: ${partita.referees.join(", ")}`
              : ""}
          </p>
        )}
        {partita.status === "scheduled" && partita.ticketingUrl && (
          <a
            href={partita.ticketingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="taglio-sm self-start border border-border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors hover:border-brand hover:text-brand-vivid"
          >
            Biglietti →
          </a>
        )}
      </header>

      {/* Voto o pagella, a seconda dello stato */}
      {votazioneAperta && (
        <SezioneVoto matchId={partita.id} chiusura={partita.votingClosesAt!} />
      )}

      {partita.votingState === "tallied" && (
        <section className="flex flex-col gap-3">
          <h2 className="display text-2xl">
            La pagella <span className="text-brand-vivid">della curva</span>
          </h2>
          <Pagella righe={await getPagella(partita.id)} />
        </section>
      )}

      {!votazioneAperta && partita.votingState !== "tallied" && (
        <p className="taglio-sm card p-4 text-sm text-muted">
          La votazione per questa partita non è aperta.
        </p>
      )}

      <SezioneTabellino
        matchId={partita.id}
        nomeCasa={partita.homeTeam}
        nomeOspiti={partita.awayTeam}
      />
    </main>
  );
}

// Parziali per quarto, dal tabellino (jsonb {"q1":{"h":25,"v":21},...}).
function Parziali({ quarterScores }: { quarterScores: unknown }) {
  if (!quarterScores || typeof quarterScores !== "object") return null;
  const periodi = Object.entries(quarterScores as Record<string, { h: number; v: number }>);
  if (periodi.length === 0) return null;
  return (
    <p className="eyebrow mt-1 border-t border-border pt-2">
      {periodi.map(([, p]) => `${p.h}-${p.v}`).join("  ·  ")}
    </p>
  );
}

async function SezioneVoto({
  matchId,
  chiusura,
}: {
  matchId: string;
  chiusura: Date;
}) {
  const utente = await getUtente();
  const profilo = utente ? await getProfilo() : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="display text-2xl text-brand-vivid">Vota il migliore</h2>
        <span className="eyebrow">chiude {soloOra(chiusura)}</span>
      </div>

      {!utente ? (
        <div className="taglio flex flex-col gap-3 card p-4">
          <p className="text-sm">
            Per votare serve l&apos;accesso: registrarsi richiede 10 secondi.
          </p>
          <Link
            href="/accesso"
            className="taglio-sm display self-start bg-brand px-5 py-2.5 text-lg text-on-brand transition-colors hover:bg-brand-hover"
          >
            Accedi e vota
          </Link>
        </div>
      ) : !profilo ? (
        <div className="taglio flex flex-col gap-3 card p-4">
          <p className="text-sm">Completa il profilo con un nickname per votare.</p>
          <Link
            href="/benvenuto"
            className="taglio-sm display self-start bg-brand px-5 py-2.5 text-lg text-on-brand transition-colors hover:bg-brand-hover"
          >
            Scegli il nickname
          </Link>
        </div>
      ) : (await haVotato(matchId, profilo.id)) ? (
        <div className="taglio border border-brand bg-brand-tint p-4">
          <p className="display text-lg text-brand-vivid">Hai già votato</p>
          <p className="mt-1 text-sm text-muted">
            La pagella si pubblica alla chiusura.
          </p>
        </div>
      ) : (
        <FormVoto matchId={matchId} votabili={await getVotabili(matchId)} />
      )}
    </section>
  );
}

async function SezioneTabellino({
  matchId,
  nomeCasa,
  nomeOspiti,
}: {
  matchId: string;
  nomeCasa: string;
  nomeOspiti: string;
}) {
  const righe = await getTabellinoPartita(matchId);
  if (righe.length === 0) return null;
  return (
    <>
      <MiglioriPartita righe={righe} nomeCasa={nomeCasa} nomeOspiti={nomeOspiti} />
      <Tabellino righe={righe} nomeCasa={nomeCasa} nomeOspiti={nomeOspiti} />
    </>
  );
}
