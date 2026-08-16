// Il tabellino di una partita dentro un articolo: versione compatta di
// src/components/tabellino.tsx — cinque colonne invece di tredici, perché
// in mezzo a un testo serve il quadro, non il foglio statistico completo.
// Chi vuole tutto clicca il punteggio e va alla pagina della partita.
//
// Il blocco salva il solo matchId: minuti, punti e valutazione si leggono
// quando la pagina si compone. Se il tabellino viene corretto dopo, in
// pagina compare la correzione senza toccare l'articolo.

import Link from "next/link";
import { z } from "zod";

import type { GraficoArticolo } from "@/src/lib/news/grafici/tipi";
import { getPartita, getTabellinoPartita, type RigaTabellino } from "@/src/lib/partite/queries";
import { ErroreTool } from "@/src/lib/social/errore";

const schema = z.strictObject({
  matchId: z.string().uuid().describe("La partita, da list_matches"),
  lato: z
    .enum(["reggio", "avversari", "entrambe"])
    .optional()
    .describe('Quale squadra mostrare. Senza indicazione: "reggio"'),
  max: z
    .number()
    .int()
    .min(3)
    .max(15)
    .optional()
    .describe("Quanti giocatori per squadra, dai migliori in giù. Senza indicazione: 8"),
});

type Params = z.output<typeof schema>;

interface Dati {
  partita: NonNullable<Awaited<ReturnType<typeof getPartita>>>;
  righe: RigaTabellino[];
}

const COLONNE = ["MIN", "PTS", "RIMB", "AS", "VAL"] as const;

function Nome({ riga }: { riga: RigaTabellino }) {
  return (
    <>
      {riga.starter ? <strong>{riga.last_name}</strong> : riga.last_name}{" "}
      <span className="text-muted">{riga.first_name?.[0]}.</span>
    </>
  );
}

function Tabella({ nome, righe }: { nome: string; righe: RigaTabellino[] }) {
  if (righe.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="eyebrow !text-foreground">{nome}</h4>
      <table className="score w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[0.625rem] text-muted">
            <th className="py-1 text-left font-semibold">Giocatore</th>
            {COLONNE.map((c) => (
              <th key={c} className="w-10 py-1 text-right font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr
              key={r.player_id ?? `${r.last_name}-${r.first_name}`}
              className="border-b border-border last:border-b-0"
            >
              <td className="py-1.5 pr-2">
                {/* Righe senza scheda giocatore (avversari letti al volo):
                    resta il nome, senza link morto */}
                {r.player_id ? (
                  <Link href={`/giocatori/${r.player_id}`} className="hover:text-brand">
                    <Nome riga={r} />
                  </Link>
                ) : (
                  <Nome riga={r} />
                )}
              </td>
              <td className="py-1.5 text-right">{r.minutes?.toFixed(0) ?? "–"}</td>
              <td className="py-1.5 text-right font-bold text-brand-vivid">{r.points ?? 0}</td>
              <td className="py-1.5 text-right">{(r.reb_off ?? 0) + (r.reb_def ?? 0)}</td>
              <td className="py-1.5 text-right">{r.assists ?? 0}</td>
              <td className="py-1.5 text-right font-semibold">{r.rating ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const tabellinoPartita: GraficoArticolo<Params, Dati> = {
  nome: "tabellino",
  descrizione:
    "Il tabellino compatto di una nostra partita (minuti, punti, rimbalzi, assist, valutazione), con punteggio in testa e link alla pagina della gara. Legge il dato vero dal database: tu passi solo l'id della partita da list_matches, i numeri non li scrivi. In grassetto il quintetto base.",
  schema,
  esempio: {
    matchId: "00000000-0000-0000-0000-000000000000",
    lato: "reggio",
    max: 8,
  },

  async verifica(p) {
    const partita = await getPartita(p.matchId);
    if (!partita) {
      throw new ErroreTool(
        `La partita ${p.matchId} non esiste. Usa list_matches per prendere l'id giusto.`,
      );
    }
    const righe = await getTabellinoPartita(p.matchId);
    if (righe.length === 0) {
      throw new ErroreTool(
        `La partita ${p.matchId} non ha ancora un tabellino a database (stato "${partita.status}"): il widget resterebbe vuoto. Aspetta che arrivi il boxscore, oppure racconta la gara a parole.`,
      );
    }
  },

  async carica(p) {
    const partita = await getPartita(p.matchId);
    if (!partita) return null;
    const righe = await getTabellinoPartita(p.matchId);
    return righe.length > 0 ? { partita, righe } : null;
  },

  render: (p, { partita, righe }) => {
    // Da che parte sta il club: sulle partite in cui non gioca (rare, ma
    // esistono in calendario) "reggio" vale come squadra di casa.
    const nostroLato = partita.awayIsReggio ? "away" : "home";
    const lato = p.lato ?? "reggio";
    const max = p.max ?? 8;
    const per = (l: "home" | "away") => righe.filter((r) => r.lato === l).slice(0, max);

    return (
      <figure className="my-1 flex flex-col gap-2">
        <Link
          href={`/partite/${partita.id}`}
          className="tabellone taglio-sm flex items-center justify-between gap-3 px-3 py-2 hover:border-brand"
        >
          <span className="text-sm font-semibold">
            {partita.homeTeam} <span className="score text-muted">–</span> {partita.awayTeam}
          </span>
          <span className="score text-lg font-bold whitespace-nowrap">
            {partita.homeScore ?? "–"}
            <span className="text-muted">:</span>
            {partita.awayScore ?? "–"}
          </span>
        </Link>

        {(lato === "entrambe" || lato === "reggio") && (
          <Tabella
            nome={nostroLato === "home" ? partita.homeTeam : partita.awayTeam}
            righe={per(nostroLato)}
          />
        )}
        {(lato === "entrambe" || lato === "avversari") && (
          <Tabella
            nome={nostroLato === "home" ? partita.awayTeam : partita.homeTeam}
            righe={per(nostroLato === "home" ? "away" : "home")}
          />
        )}

        <figcaption className="text-xs text-muted">
          In grassetto il quintetto base · VAL valutazione · dati ufficiali LBA
        </figcaption>
      </figure>
    );
  },
};
