import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Boato } from "@/src/components/boato";
import { CampoPartita } from "@/src/components/campo-partita";
import { FormVoto } from "@/src/components/form-voto";
import { IoCiSono } from "@/src/components/io-ci-sono";
import { Pagella } from "@/src/components/pagella";
import {
  PartitaLive,
  ScoreboardLive,
  TabellinoLive,
  TabellinoVuotoLive,
} from "@/src/components/partita-live";
import { Pronostici } from "@/src/components/pronostici";
import { Reazioni } from "@/src/components/reazioni";
import { TornaIndietro } from "@/src/components/torna-indietro";
import { getProfilo } from "@/src/lib/identita/sessione";
import { dataBreve, etichettaStagione, soloOra } from "@/src/lib/date";
import { getFlag } from "@/src/lib/flag";
import { contestoPartita } from "@/src/lib/partite/etichette";
import {
  getPagella,
  getPartita,
  getTabellinoPartita,
  getVotabili,
  haVotato,
} from "@/src/lib/partite/queries";
import { getQuintettiPartita } from "@/src/lib/partite/quintetti";
import { getTabellinoLive } from "@/src/lib/partite/tabellino-live";
import { getTabellinoVuoto } from "@/src/lib/partite/tabellino-vuoto";
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

  // Scheda squadra: Reggio ha la sua pagina; le avversarie LBA la loro;
  // le avversarie di coppa (BCL, senza lbaTeamId) nessuna, per scelta.
  const scheda = (isReggio: boolean, lbaTeamId: number | null) =>
    isReggio ? "/giocatori" : lbaTeamId ? `/squadre/${lbaTeamId}` : null;

  return (
    <PartitaLive
      lbaMatchId={partita.lbaMatchId}
      inizio={partita.startsAt.toISOString()}
      statoIniziale={partita.status}
    >
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-6 lg:max-w-2xl">
      <TornaIndietro fallback="/calendario" etichetta="Partite" />

      {/* Scoreboard: punteggio e parziali si aggiornano da soli durante
          la gara (PartitaLive), il resto è renderizzato dal server */}
      <header className="-mt-4 flex flex-col gap-3">
        {/* Il tabellone: contesto sulla fascia in alto, poi le due squadre
            coi parziali per quarto e il totale, come al palazzetto */}
        <div className="tabellone taglio flex flex-col">
          {/* Contesto compatto: sul telefono "Supercoppa 2026 · Semifinali ·
              sab 19 set 2026, 00:00" veniva tagliato a metà */}
          <p className="fascia truncate border-b border-border px-4 py-2.5">
            <span className="font-bold">{contestoPartita(partita)}</span> ·{" "}
            {dataBreve(partita.startsAt)}
          </p>
          <div className="flex flex-col gap-2 px-4 py-3.5">
            <ScoreboardLive
              nomeCasa={partita.homeTeam}
              schedaCasa={scheda(partita.homeIsReggio, partita.homeLbaTeamId)}
              logoCasa={partita.homeLogoKey}
              nomeOspiti={partita.awayTeam}
              schedaOspiti={scheda(partita.awayIsReggio, partita.awayLbaTeamId)}
              logoOspiti={partita.awayLogoKey}
              punteggioCasa={partita.homeScore}
              punteggioOspiti={partita.awayScore}
              statoIniziale={partita.status}
              parzialiIniziali={partita.quarterScores}
            />
          </div>
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

      {/* Finché la gara non è finita, il posto del tabellino lo prendono le
          due squadre schierate: prima della palla a due è l'unica cosa da
          guardare, e a gara in corso dice chi ha aperto */}
      {!giocata && (
        <Suspense fallback={<AttesaCampo />}>
          <SezioneQuintetti partita={partita} />
        </Suspense>
      )}

      {/* Gara da giocare: dopo i quintetti, la tabella del tabellino a zero
          con le due rose intere. Si vede chi può giocare, e alla palla a due
          la pagina non cambia forma — la stessa tabella si riempie */}
      {daGiocare && (
        <Suspense fallback={<AttesaTabellino />}>
          <SezioneTabellinoVuoto
            matchId={partita.id}
            nomeCasa={partita.homeTeam}
            nomeOspiti={partita.awayTeam}
          />
        </Suspense>
      )}

      {/* Suspense: la pagina esce subito, il tabellino arriva dopo
          (per le gare non di Reggio si legge al volo dalla fonte). A gara da
          giocare non c'è nulla da attendere qui — il posto lo tiene la
          tabella a zero, e due scheletri uguali di fila sembravano un bug */}
      <Suspense fallback={daGiocare ? null : <AttesaTabellino />}>
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

function AttesaCampo() {
  return (
    <section className="flex flex-col gap-3" aria-busy>
      <h2 className="display text-2xl">In campo</h2>
      <div className="taglio-sm card aspect-[300/620] animate-pulse" />
    </section>
  );
}

// I due quintetti: dalla fonte, quindi in Suspense come il tabellino.
async function SezioneQuintetti({
  partita,
}: {
  partita: NonNullable<Awaited<ReturnType<typeof getPartita>>>;
}) {
  const quintetti = await getQuintettiPartita(partita.id);
  if (!quintetti) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="display text-2xl">In campo</h2>
      <CampoPartita
        casa={{
          ...quintetti.casa,
          nome: partita.homeTeam,
          logoKey: partita.homeLogoKey,
          scheda: partita.homeIsReggio
            ? "/giocatori"
            : partita.homeLbaTeamId
              ? `/squadre/${partita.homeLbaTeamId}`
              : null,
        }}
        ospiti={{
          ...quintetti.ospiti,
          nome: partita.awayTeam,
          logoKey: partita.awayLogoKey,
          scheda: partita.awayIsReggio
            ? "/giocatori"
            : partita.awayLbaTeamId
              ? `/squadre/${partita.awayLbaTeamId}`
              : null,
        }}
      />
    </section>
  );
}

// Le due rose come tabellino a zero: la fonte va interrogata, quindi in
// Suspense come le altre sezioni che dipendono da lei.
async function SezioneTabellinoVuoto({
  matchId,
  nomeCasa,
  nomeOspiti,
}: {
  matchId: string;
  nomeCasa: string;
  nomeOspiti: string;
}) {
  const { righe, stagionePrecedente } = await getTabellinoVuoto(matchId);

  return (
    <TabellinoVuotoLive
      righe={righe}
      etichettaRose={
        stagionePrecedente
          ? `Le rose nuove non sono ancora state pubblicate: questi sono i giocatori della ${etichettaStagione(stagionePrecedente)}`
          : "Queste sono le due rose al completo"
      }
      nomeCasa={nomeCasa}
      nomeOspiti={nomeOspiti}
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
  // Niente cancelli: il modulo si mostra a chiunque e l'identità anonima
  // nasce al momento del voto, dentro la server action.
  const profilo = await getProfilo();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="display text-2xl text-brand-vivid">Vota il migliore</h2>
        <span className="eyebrow">chiude {soloOra(chiusura)}</span>
      </div>

      {profilo && (await haVotato(matchId, profilo.id)) ? (
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
