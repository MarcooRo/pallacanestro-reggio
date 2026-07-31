import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormVoto } from "@/src/components/form-voto";
import { Pagella } from "@/src/components/pagella";
import { Tabellino } from "@/src/components/tabellino";
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

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      {/* Intestazione partita */}
      <header className="flex flex-col gap-3">
        <p className="text-xs text-muted">
          {partita.competitionName}
          {partita.dayName ? ` · ${partita.dayName}` : ""} ·{" "}
          {dataOra(partita.startsAt)}
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
          {[
            { squadra: partita.homeTeam, punti: partita.homeScore },
            { squadra: partita.awayTeam, punti: partita.awayScore },
          ].map(({ squadra, punti }) => (
            <div key={squadra} className="flex items-center justify-between gap-3">
              <span className="font-semibold">{squadra}</span>
              {partita.status === "finished" && (
                <span className="text-xl font-bold tabular-nums">{punti}</span>
              )}
            </div>
          ))}
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
            className="self-start rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
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
          <h2 className="text-xl font-bold">La pagella della curva</h2>
          <Pagella righe={await getPagella(partita.id)} />
        </section>
      )}

      {!votazioneAperta && partita.votingState !== "tallied" && (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
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
    <p className="text-xs tabular-nums text-muted">
      Parziali: {periodi.map(([, p]) => `${p.h}-${p.v}`).join(" · ")}
    </p>
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
  return <Tabellino righe={righe} nomeCasa={nomeCasa} nomeOspiti={nomeOspiti} />;
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
        <h2 className="text-xl font-bold">Vota il migliore</h2>
        <span className="text-xs text-muted">chiude {soloOra(chiusura)}</span>
      </div>

      {!utente ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm">Per votare serve l&apos;accesso: solo email, niente password.</p>
          <Link
            href="/accesso"
            className="self-start rounded-md bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
          >
            Accedi e vota
          </Link>
        </div>
      ) : !profilo ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm">Completa il profilo con un nickname per votare.</p>
          <Link
            href="/benvenuto"
            className="self-start rounded-md bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
          >
            Scegli il nickname
          </Link>
        </div>
      ) : (await haVotato(matchId, profilo.id)) ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm">
          <strong>Hai già votato.</strong> La pagella si pubblica alla chiusura.
        </p>
      ) : (
        <FormVoto matchId={matchId} votabili={await getVotabili(matchId)} />
      )}
    </section>
  );
}
