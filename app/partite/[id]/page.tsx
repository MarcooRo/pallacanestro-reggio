import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Boato } from "@/src/components/boato";
import { FormVoto } from "@/src/components/form-voto";
import { IoCiSono } from "@/src/components/io-ci-sono";
import { Pagella } from "@/src/components/pagella";
import {
  PartitaLive,
  ScoreboardLive,
  TabellinoLive,
} from "@/src/components/partita-live";
import { Pronostici } from "@/src/components/pronostici";
import { Reazioni } from "@/src/components/reazioni";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { getProfilo, getUtente } from "@/src/lib/auth/session";
import { dataOra, soloOra } from "@/src/lib/date";
import { getFlag } from "@/src/lib/flag";
import { fotoUrl } from "@/src/lib/immagini";
import {
  getPagella,
  getPartita,
  getTabellinoPartita,
  getVotabili,
  haVotato,
} from "@/src/lib/partite/queries";
import { getTabellinoLive } from "@/src/lib/partite/tabellino-live";
import { getStatoPresenza } from "@/src/lib/presenza/queries";
import { getPronosticiPartita } from "@/src/lib/pronostici/queries";
import { getStatoReazioni } from "@/src/lib/reazioni/queries";
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

  const [flag, profilo] = await Promise.all([getFlag(), getProfilo()]);
  const votazioneAperta = finestraAperta(partita, new Date());
  const giocata = partita.status === "finished";
  const daGiocare = partita.status === "scheduled" && partita.startsAt > new Date();

  return (
    <PartitaLive
      lbaMatchId={partita.lbaMatchId}
      inizio={partita.startsAt.toISOString()}
      statoIniziale={partita.status}
    >
    <main className="flex flex-1 flex-col gap-8 px-4 py-6">
      <TornaIndietro fallback="/calendario" etichetta="Partite" />

      {/* Scoreboard: punteggio e parziali si aggiornano da soli durante
          la gara (PartitaLive), il resto è renderizzato dal server */}
      <header className="-mt-4 flex flex-col gap-3">
        <div className="taglio flex flex-col gap-3 card p-4">
          {/* Prima riga: contesto a sinistra, logo società a destra */}
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow">
              {partita.competitionName}
              {partita.dayName ? ` · ${partita.dayName}` : ""} ·{" "}
              {dataOra(partita.startsAt)}
            </p>
            <LogoSocieta partita={partita} />
          </div>
          <ScoreboardLive
            nomeCasa={partita.homeTeam}
            schedaCasa={
              partita.homeIsReggio
                ? "/giocatori"
                : `/squadre/${partita.homeLbaTeamId}`
            }
            nomeOspiti={partita.awayTeam}
            schedaOspiti={
              partita.awayIsReggio
                ? "/giocatori"
                : `/squadre/${partita.awayLbaTeamId}`
            }
            punteggioCasa={partita.homeScore}
            punteggioOspiti={partita.awayScore}
            statoIniziale={partita.status}
            parzialiIniziali={partita.quarterScores}
          />
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

        {/* "Io ci sono": dichiarazione, subito sotto ai biglietti */}
        {flag.ioCiSono && daGiocare && (
          <SezionePresenza matchId={partita.id} userId={profilo?.id ?? null} />
        )}

        {/* La reazione al risultato sta attaccata al risultato */}
        {flag.reazioni && giocata && (
          <SezioneReazioni matchId={partita.id} userId={profilo?.id ?? null} />
        )}
      </header>

      {/* Il boato vive solo nella finestra della gara: il componente si
          nasconde da sé fuori da quella */}
      {flag.boato && (
        <Boato
          matchId={partita.id}
          inizio={partita.startsAt.toISOString()}
          statoIniziale={partita.status}
          loggato={Boolean(profilo)}
        />
      )}

      {flag.pronostici && (
        <SezionePronostici matchId={partita.id} userId={profilo?.id ?? null} />
      )}

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

      {/* Suspense: la pagina esce subito, il tabellino arriva dopo
          (per le gare non di Reggio si legge al volo dalla fonte) */}
      <Suspense fallback={<AttesaTabellino />}>
        <SezioneTabellino
          matchId={partita.id}
          lbaMatchId={partita.lbaMatchId}
          giocata={giocata || partita.status === "live"}
          nomeCasa={partita.homeTeam}
          nomeOspiti={partita.awayTeam}
        />
      </Suspense>
    </main>
    </PartitaLive>
  );
}

function AttesaTabellino() {
  return (
    <section className="flex flex-col gap-3" aria-busy>
      <h2 className="display text-2xl">Tabellino</h2>
      <div className="taglio-sm card h-44 animate-pulse" />
    </section>
  );
}

// Il logo della società in alto a destra nella card: Reggio se gioca,
// altrimenti la squadra di casa della gara.
function LogoSocieta({
  partita,
}: {
  partita: NonNullable<Awaited<ReturnType<typeof getPartita>>>;
}) {
  const logoKey = partita.awayIsReggio
    ? partita.awayLogoKey
    : partita.homeLogoKey;
  const nome = partita.awayIsReggio ? partita.awayTeam : partita.homeTeam;
  const url = fotoUrl(logoKey, "thumb");
  if (!url) return null;
  return (
    <Image
      src={url}
      alt={`Logo ${nome}`}
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 object-contain"
    />
  );
}

async function SezionePresenza({
  matchId,
  userId,
}: {
  matchId: string;
  userId: string | null;
}) {
  return (
    <IoCiSono
      matchId={matchId}
      statoIniziale={await getStatoPresenza(matchId, userId)}
      loggato={Boolean(userId)}
    />
  );
}

async function SezioneReazioni({
  matchId,
  userId,
}: {
  matchId: string;
  userId: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="eyebrow">Come l&apos;hai vissuta</p>
      <Reazioni
        matchId={matchId}
        statoIniziale={await getStatoReazioni(matchId, userId)}
        loggato={Boolean(userId)}
      />
    </div>
  );
}

async function SezionePronostici({
  matchId,
  userId,
}: {
  matchId: string;
  userId: string | null;
}) {
  // Nessuna domanda per questa partita: il componente non rende nulla.
  return (
    <Pronostici
      iniziali={await getPronosticiPartita(matchId, userId)}
      loggato={Boolean(userId)}
    />
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
  lbaMatchId,
  giocata,
  nomeCasa,
  nomeOspiti,
}: {
  matchId: string;
  lbaMatchId: number | null;
  giocata: boolean;
  nomeCasa: string;
  nomeOspiti: string;
}) {
  // Prima l'archivio (gare di Reggio); per le altre, lettura al volo
  // dalla fonte, senza memorizzare.
  let righe = await getTabellinoPartita(matchId);
  if (righe.length === 0 && giocata && lbaMatchId) {
    righe = await getTabellinoLive(lbaMatchId);
  }
  // Nessuna uscita anticipata sul vuoto: a gara in corso le righe possono
  // arrivare dalla diretta anche quando qui non c'è ancora niente.
  return (
    <TabellinoLive
      righeIniziali={righe}
      nomeCasa={nomeCasa}
      nomeOspiti={nomeOspiti}
    />
  );
}
