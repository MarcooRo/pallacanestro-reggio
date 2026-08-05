"use client";

// Aggiornamento in diretta della pagina partita: punteggio, parziali e
// tabellino. Il polling lo fa il client, non un cron — la rotta
// /api/live è cacheata sulla CDN, quindi il costo non cresce con gli
// spettatori. Una sola richiesta per giro, condivisa dalle due sezioni
// della pagina tramite contesto.

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MiglioriPartita } from "@/src/components/migliori-partita";
import { Tabellino } from "@/src/components/tabellino";
import type { StatoPartita } from "@/src/ingestion/normalize";
import type { RigaTabellino } from "@/src/lib/partite/queries";

// Stesso valore della cache CDN in /api/live: chiedere più spesso
// otterrebbe la stessa risposta.
const ATTESA_MS = 20_000;
// Dopo errori ripetuti si rallenta fino a qui, per non martellare una
// fonte che è già in difficoltà.
const ATTESA_MASSIMA_MS = 120_000;
// Quando ha senso chiedere: la fonte non dichiara "live" in anticipo e il
// nostro stato a database lo aggiorna il cron una volta al giorno, quindi
// la finestra si decide dall'orario della palla a due.
const ANTICIPO_MS = 15 * 60_000;
const DURATA_MASSIMA_MS = 3 * 60 * 60_000;

export interface DatiLive {
  status: StatoPartita;
  homeScore: number | null;
  awayScore: number | null;
  parziali: Record<string, { h: number; v: number }>;
  righe: RigaTabellino[];
}

const ContestoLive = createContext<DatiLive | null>(null);

export function PartitaLive({
  lbaMatchId,
  inizio,
  statoIniziale,
  children,
}: {
  lbaMatchId: number | null;
  /** ISO: il componente è client, la Date non attraversa il confine */
  inizio: string;
  /** matches.status dal database (colonna text con check, non un enum TS) */
  statoIniziale: string;
  children: ReactNode;
}) {
  const [dati, setDati] = useState<DatiLive | null>(null);

  useEffect(() => {
    // Gara già archiviata, rinviata o annullata: non c'è diretta da seguire.
    if (!lbaMatchId) return;
    if (statoIniziale !== "scheduled" && statoIniziale !== "live") return;

    const inizioMs = new Date(inizio).getTime();
    const apertura = inizioMs - ANTICIPO_MS;
    const chiusura = inizioMs + DURATA_MASSIMA_MS;

    let attesa = ATTESA_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let smontato = false;
    let finita = false;
    // Un giro alla volta: il ritorno sulla scheda può richiamare giro()
    // mentre una richiesta è ancora in volo, e due loop paralleli
    // programmerebbero timer che nessuno annulla più.
    let inVolo = false;

    const programma = (ms: number) => {
      timer = setTimeout(giro, ms);
    };

    async function giro() {
      if (smontato || finita || inVolo) return;

      const ora = Date.now();
      // Prima della finestra si aspetta la palla a due invece di chiedere
      // a vuoto; dopo la finestra si smette del tutto.
      if (ora < apertura) return programma(apertura - ora);
      if (ora > chiusura) return;
      // In secondo piano non si consuma rete: si ricontrolla al ritorno.
      if (document.hidden) return programma(ATTESA_MS);

      inVolo = true;
      try {
        const risposta = await fetch(`/api/live/${lbaMatchId}`);
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const nuovi = (await risposta.json()) as DatiLive;
        if (smontato) return;
        setDati(nuovi);
        attesa = ATTESA_MS;
        // Ultimo aggiornamento incassato: da qui in poi cambia solo il
        // tabellino definitivo, che arriva dal cron.
        if (nuovi.status === "finished") {
          finita = true;
          return;
        }
      } catch {
        // Fonte giù: si tiene quello che c'è già a schermo e si rallenta.
        attesa = Math.min(attesa * 2, ATTESA_MASSIMA_MS);
      } finally {
        inVolo = false;
      }

      programma(attesa);
    }

    // Tornando sulla scheda si riallinea subito, senza aspettare il giro.
    const alRitorno = () => {
      const ora = Date.now();
      if (document.hidden || finita || ora < apertura || ora > chiusura) return;
      clearTimeout(timer);
      giro();
    };

    giro();
    document.addEventListener("visibilitychange", alRitorno);
    return () => {
      smontato = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", alRitorno);
    };
  }, [lbaMatchId, inizio, statoIniziale]);

  return <ContestoLive.Provider value={dati}>{children}</ContestoLive.Provider>;
}

export function ScoreboardLive({
  nomeCasa,
  schedaCasa,
  logoCasa,
  nomeOspiti,
  schedaOspiti,
  logoOspiti,
  punteggioCasa,
  punteggioOspiti,
  statoIniziale,
  parzialiIniziali,
}: {
  nomeCasa: string;
  schedaCasa: string;
  /** URL già risolto: fotoUrl è puro, ma il confine lo attraversa una stringa */
  logoCasa: string | null;
  nomeOspiti: string;
  schedaOspiti: string;
  logoOspiti: string | null;
  punteggioCasa: number | null;
  punteggioOspiti: number | null;
  /** matches.status dal database (colonna text con check, non un enum TS) */
  statoIniziale: string;
  /** jsonb dal database: si valida qui come per il resto della pagina */
  parzialiIniziali: unknown;
}) {
  const dati = useContext(ContestoLive);

  const stato = dati?.status ?? statoIniziale;
  const finita = stato === "finished";
  const inCorso = stato === "live";
  const casa = dati?.homeScore ?? punteggioCasa;
  const ospiti = dati?.awayScore ?? punteggioOspiti;
  const mostraPunti = (finita || inCorso) && casa !== null && ospiti !== null;
  const periodi = leggiParziali(dati?.parziali ?? parzialiIniziali);

  const squadre = [
    {
      nome: nomeCasa,
      scheda: schedaCasa,
      logo: logoCasa,
      punti: casa,
      avanti: mostraPunti && casa! > ospiti!,
    },
    {
      nome: nomeOspiti,
      scheda: schedaOspiti,
      logo: logoOspiti,
      punti: ospiti,
      avanti: mostraPunti && ospiti! > casa!,
    },
  ];

  return (
    <>
      {inCorso && (
        <p className="eyebrow flex items-center gap-1.5 text-brand-vivid">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-vivid" />
          Diretta
        </p>
      )}

      {/* Le due squadre col totale: senza punteggio il nome è il manifesto
          della serata e prende tutto lo spazio */}
      {squadre.map(({ nome, scheda, logo, punti, avanti }) => (
        <div key={nome} className="flex items-center gap-2.5">
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
          ) : (
            <span aria-hidden className="h-7 w-7 shrink-0" />
          )}
          {/* Il nome apre la scheda squadra (Reggio: la sua pagina) */}
          {/* Il nome va a capo, non in "…": sul telefono "Bertram Derthona
              Tortona" a text-2xl diventava "BERTRAM DERTH…" */}
          <Link
            href={scheda}
            className={`display min-w-0 flex-1 break-words leading-[1.05] transition-colors hover:text-brand-vivid ${
              mostraPunti ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
            } ${finita && !avanti ? "text-muted" : ""}`}
          >
            {nome}
          </Link>
          {mostraPunti && (
            <span
              className={`score shrink-0 text-3xl font-bold tabular-nums ${
                avanti ? "led text-brand-vivid" : finita ? "text-muted" : ""
              }`}
            >
              {punti}
            </span>
          )}
        </div>
      ))}

      {/* Fascia dei parziali: una cella per quarto, casa-ospiti come sopra */}
      {periodi.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-2.5">
          {periodi.map(([nome, p]) => (
            <div key={nome} className="flex flex-col items-center gap-0.5">
              <span className="eyebrow text-[10px]">{nome.toUpperCase()}</span>
              <span className="score text-sm font-bold tabular-nums">
                <span className={p.h > p.v ? "text-foreground" : "text-muted"}>
                  {p.h}
                </span>
                <span className="px-0.5 text-muted">-</span>
                <span className={p.v > p.h ? "text-foreground" : "text-muted"}>
                  {p.v}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Il tabellino con le righe più fresche: quelle della diretta se sono
// arrivate, altrimenti quelle già renderizzate dal server.
export function TabellinoLive({
  righeIniziali,
  nomeCasa,
  nomeOspiti,
}: {
  righeIniziali: RigaTabellino[];
  nomeCasa: string;
  nomeOspiti: string;
}) {
  const dati = useContext(ContestoLive);
  const righe = dati?.righe.length ? dati.righe : righeIniziali;
  if (righe.length === 0) return null;
  return (
    <>
      <MiglioriPartita righe={righe} nomeCasa={nomeCasa} nomeOspiti={nomeOspiti} />
      <Tabellino righe={righe} nomeCasa={nomeCasa} nomeOspiti={nomeOspiti} />
    </>
  );
}

// Parziali per quarto, dal tabellino (jsonb {"q1":{"h":25,"v":21},...}).
// In evidenza: una cella per periodo, chi lo vince è in rosso.
// I parziali dal jsonb (o dalla diretta): si validano qui, come il resto
// di quello che arriva dal database senza tipo.
function leggiParziali(
  quarterScores: unknown,
): [string, { h: number; v: number }][] {
  if (!quarterScores || typeof quarterScores !== "object") return [];
  return Object.entries(
    quarterScores as Record<string, { h: number; v: number }>,
  ).filter(
    ([, p]) => p && typeof p.h === "number" && typeof p.v === "number",
  );
}
