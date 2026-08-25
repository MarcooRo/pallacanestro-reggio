import type { Metadata } from "next";
import Link from "next/link";

import {
  aggiornaNewsAction,
  aggiornaPartita,
  annullaPronostico,
  apriVotazione,
  chiudiEPubblicaPagella,
  ricalcolaPagella,
  chiudiPronostico,
  creaPronostico,
  risolviPronostico,
  salvaFlag,
} from "@/src/lib/admin/actions";
import { richiediAdmin } from "@/src/lib/identita/admin";
import { dataOra } from "@/src/lib/date";
import { CHIAVI_FLAG, getFlag, NOMI_FLAG } from "@/src/lib/flag";
import { contaBozzeArticoli } from "@/src/lib/news/queries";
import { getPartiteClubCasa, type PartitaLista } from "@/src/lib/partite/queries";
import {
  getPronosticiAdmin,
  type PronosticoAdmin,
} from "@/src/lib/pronostici/queries";
import { MAX_OPZIONI } from "@/src/lib/pronostici/regole";
import { ORE_FINESTRA_DEFAULT } from "@/src/lib/voto/regole";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string }>;
}) {
  // Autorizzazione nella pagina E in ogni action. Mai nel proxy.
  await richiediAdmin();

  const { esito } = await searchParams;
  const [partite, flag, bozze] = await Promise.all([
    getPartiteClubCasa(),
    getFlag(),
    contaBozzeArticoli(),
  ]);
  const pronostici = await getPronosticiAdmin(partite.map((p) => p.id));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-8 lg:max-w-2xl">
      <h1 className="text-2xl font-bold">Admin · Partite</h1>
      <p className="text-sm text-muted">
        Le partite del club: prima la prossima da giocare, poi le giocate
        dalla più recente. Apertura voto, chiusura con pubblicazione della
        pagella, correzione del risultato.
      </p>

      {/* Le tre aree come card piene, non righe di testo: dal telefono
          si centrano col pollice senza mirare */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/admin/social"
          className="flex flex-col gap-0.5 rounded-md border border-border-strong px-4 py-3 hover:bg-surface"
        >
          <span className="text-sm font-bold text-brand">Social →</span>
          <span className="text-xs text-muted">la coda dei post</span>
        </Link>
        <Link
          href="/admin/news"
          className="flex flex-col gap-0.5 rounded-md border border-border-strong px-4 py-3 hover:bg-surface"
        >
          <span className="text-sm font-bold text-brand">Articoli →</span>
          <span className="text-xs text-muted">
            i pezzi nostri{bozze > 0 ? ` (${bozze} in bozza)` : ""}
          </span>
        </Link>
        <Link
          href="/admin/media"
          className="flex flex-col gap-0.5 rounded-md border border-border-strong px-4 py-3 hover:bg-surface"
        >
          <span className="text-sm font-bold text-brand">Foto →</span>
          <span className="text-xs text-muted">la libreria media</span>
        </Link>
      </div>

      {esito && (
        <p className="rounded-md bg-brand-tint px-3 py-2 text-sm font-semibold text-brand">
          {esito}
        </p>
      )}

      <form action={aggiornaNewsAction}>
        <button
          type="submit"
          className="btn-admin btn-admin-bordo"
        >
          Aggiorna news dalle fonti
        </button>
      </form>

      {/* Interruttori: si costruisce una funzionalità e si accende quando ha
          senso mostrarla, senza passare da un redeploy */}
      <form
        action={salvaFlag}
        className="flex flex-col gap-3 rounded-lg border border-border-strong p-4"
      >
        <h2 className="text-sm font-black uppercase tracking-wide">Funzionalità</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {CHIAVI_FLAG.map((chiave) => (
            <label key={chiave} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="flag"
                value={chiave}
                defaultChecked={flag[chiave]}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              {NOMI_FLAG[chiave]}
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="btn-admin btn-admin-bordo self-start"
        >
          Salva funzionalità
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {partite.map((p) => (
          <RigaAdmin
            key={p.id}
            partita={p}
            pronostici={pronostici.get(p.id) ?? []}
          />
        ))}
      </div>
    </main>
  );
}

const etichettaPronostico: Record<string, string> = {
  open: "aperto",
  closed: "chiuso, da risolvere",
  resolved: "risolto",
  voided: "annullato",
};

// Una domanda nel pannello: stato, risposte e le due azioni che servono
// davvero (chiudere alle risposte, dire qual era quella giusta).
function PronosticoAdminRiga({ pronostico }: { pronostico: PronosticoAdmin }) {
  const risolvibile =
    pronostico.status === "open" || pronostico.status === "closed";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{pronostico.question}</p>
        <span className="shrink-0 text-xs text-muted">
          {etichettaPronostico[pronostico.status] ?? pronostico.status} ·{" "}
          {pronostico.risposte} risp.
        </span>
      </div>
      <p className="text-xs text-muted">
        chiude {dataOra(pronostico.closesAt)}
        {pronostico.corretta !== null
          ? ` · giusta: ${pronostico.opzioni[pronostico.corretta] ?? "?"}`
          : ""}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {pronostico.status === "open" && (
          <form action={chiudiPronostico}>
            <input type="hidden" name="predictionId" value={pronostico.id} />
            <button
              type="submit"
              className="btn-admin btn-admin-bordo"
            >
              Chiudi alle risposte
            </button>
          </form>
        )}

        {risolvibile && (
          <form action={risolviPronostico} className="flex items-center gap-2">
            <input type="hidden" name="predictionId" value={pronostico.id} />
            <select
              name="opzione"
              defaultValue=""
              required
              className="rounded-md border border-border-strong bg-background px-2 py-2 text-sm"
            >
              <option value="" disabled>
                risposta giusta…
              </option>
              {pronostico.opzioni.map((voce, i) => (
                <option key={i} value={i}>
                  {voce}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-admin btn-admin-pieno"
            >
              Risolvi
            </button>
          </form>
        )}

        {pronostico.status !== "voided" && (
          <form action={annullaPronostico}>
            <input type="hidden" name="predictionId" value={pronostico.id} />
            <button
              type="submit"
              className="btn-admin btn-admin-bordo btn-admin-lieve"
            >
              Annulla
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const etichettaStato: Record<string, string> = {
  closed: "voto chiuso",
  open: "VOTO APERTO",
  tallied: "pagella pubblicata",
};

function RigaAdmin({
  partita,
  pronostici,
}: {
  partita: PartitaLista;
  pronostici: PronosticoAdmin[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-strong p-4">
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
              className="w-16 rounded-md border border-border-strong bg-background px-2 py-2 text-sm"
            />
            <button
              type="submit"
              className="btn-admin btn-admin-pieno"
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
              className="btn-admin btn-admin-pieno"
            >
              Chiudi e pubblica pagella
            </button>
          </form>
        )}

        {/* Rilegge i voti e riscrive i conteggi, senza push né cambi di
            stato: serve quando cambiano i pesi delle classifiche */}
        {partita.votingState === "tallied" && (
          <form action={ricalcolaPagella}>
            <input type="hidden" name="matchId" value={partita.id} />
            <button
              type="submit"
              className="btn-admin btn-admin-bordo"
            >
              Ricalcola pagella
            </button>
          </form>
        )}
      </div>

      <details open={pronostici.some((p) => p.status === "closed")}>
        <summary className="cursor-pointer py-1 text-sm text-muted">
          Pronostici{pronostici.length > 0 ? ` (${pronostici.length})` : ""}
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          {pronostici.map((p) => (
            <PronosticoAdminRiga key={p.id} pronostico={p} />
          ))}

          {/* Le risposte non si modificano dopo la creazione: sono salvate
              come indice, cambiarle falserebbe i conteggi */}
          <form action={creaPronostico} className="flex flex-col gap-2">
            <input type="hidden" name="matchId" value={partita.id} />
            <input
              name="question"
              placeholder="Domanda (es. chi prende il primo rimbalzo?)"
              required
              maxLength={140}
              className="rounded-md border border-border-strong bg-background px-2 py-1.5 text-sm"
            />
            <textarea
              name="options"
              placeholder={`Una risposta per riga (max ${MAX_OPZIONI})`}
              required
              rows={4}
              className="rounded-md border border-border-strong bg-background px-2 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              chiude
              <input
                name="closesAt"
                type="datetime-local"
                className="rounded-md border border-border-strong bg-background px-2 py-2 text-sm"
              />
              <span>(vuoto = palla a due)</span>
            </label>
            <button
              type="submit"
              className="btn-admin btn-admin-pieno self-start"
            >
              Crea pronostico
            </button>
          </form>
        </div>
      </details>

      <details>
        <summary className="cursor-pointer py-1 text-sm text-muted">
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
            className="w-20 rounded-md border border-border-strong bg-background px-2 py-2 text-sm"
          />
          <input
            name="awayScore"
            type="number"
            min={0}
            defaultValue={partita.awayScore ?? ""}
            placeholder="ospiti"
            className="w-20 rounded-md border border-border-strong bg-background px-2 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={partita.status}
            className="rounded-md border border-border-strong bg-background px-2 py-2 text-sm"
          >
            <option value="scheduled">in programma</option>
            <option value="live">in corso</option>
            <option value="finished">finita</option>
            <option value="postponed">rinviata</option>
            <option value="cancelled">annullata</option>
          </select>
          <button
            type="submit"
            className="btn-admin btn-admin-bordo"
          >
            Salva
          </button>
        </form>
      </details>
    </div>
  );
}
