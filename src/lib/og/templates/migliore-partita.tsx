// Il contenuto identitario del progetto: il migliore della partita votato
// dalla curva. Il cognome del vincitore è l'elemento più grande della
// grafica; il punteggio è contesto, piccolo e in alto.
//
// Vincolo di prodotto: sotto i 30 votanti si pubblica il nome ma non la
// percentuale (showPercent: false) e il layout deve reggere senza buchi:
// il blocco centrale è centrato in verticale, la percentuale è un blocco
// in più, non un segnaposto.

import { z } from "zod";

import { branding } from "@/src/branding";

import { SfondoFoto } from "../sfondo-foto";
import type { TemplateOg } from "../tipi";

const schema = z.strictObject({
  /** Foto di sfondo opzionale, sotto un velo scuro. In una composizione
      {assetId, template} si compila da solo con l'url dell'asset. */
  imageUrl: z.url().optional(),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  /** Già formattata per la grafica, es. "5 ottobre 2026" */
  date: z.string().min(1),
  winner: z.strictObject({
    name: z.string(),
    surname: z.string().min(1),
    percent: z.number().min(0).max(100),
    votes: z.number().int().min(0),
  }),
  runnersUp: z
    .array(
      z.strictObject({
        surname: z.string().min(1),
        percent: z.number().min(0).max(100),
      }),
    )
    .max(2)
    .default([]),
  showPercent: z.boolean(),
});

type Params = z.output<typeof schema>;

const { colori } = branding;
const attenuato = "rgba(255,255,255,0.55)";
const spento = "rgba(255,255,255,0.38)";

// Il cognome deve riempire la larghezza senza uscirne: la dimensione
// scala con la lunghezza (ExtraBold maiuscolo ≈ 0.62em per carattere
// su ~920px utili).
function corpoCognome(cognome: string): number {
  return Math.min(190, Math.floor(1480 / cognome.length));
}

function render(p: Params) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: colori.scuro,
        color: "#ffffff",
        fontFamily: "Archivo",
        padding: "72px 80px 64px",
      }}
    >
      {p.imageUrl && <SfondoFoto url={p.imageUrl} />}
      {/* Il punteggio: contesto, secondario */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: attenuato,
            textAlign: "center",
          }}
        >
          {`${p.homeTeam} ${p.homeScore} – ${p.awayScore} ${p.awayTeam}`}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: spento }}>{p.date}</div>
      </div>

      {/* Il migliore: l'elemento più grande della grafica */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: colori.vivo,
          }}
        >
          <div style={{ width: 56, height: 4, backgroundColor: colori.vivo }} />
          <div style={{ display: "flex" }}>Il migliore</div>
          <div style={{ width: 56, height: 4, backgroundColor: colori.vivo }} />
        </div>

        {p.winner.name && (
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 4,
              marginTop: 16,
            }}
          >
            {p.winner.name}
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontSize: corpoCognome(p.winner.surname),
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 0.95,
            textAlign: "center",
            color: colori.vivo,
          }}
        >
          {p.winner.surname}
        </div>

        {p.showPercent && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1 }}>
              {`${Math.round(p.winner.percent)}%`}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: attenuato, marginTop: 8 }}>
              {`dei ${p.winner.votes} voti della curva`}
            </div>
          </div>
        )}
      </div>

      {/* I secondi classificati: una riga sottile, in fondo */}
      {p.runnersUp.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 48,
            fontSize: 30,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: attenuato,
          }}
        >
          {p.runnersUp.map((r, i) => (
            <div key={r.surname} style={{ display: "flex" }}>
              {`${i + 2}° ${r.surname}${p.showPercent ? ` · ${Math.round(r.percent)}%` : ""}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const migliorePartita: TemplateOg<Params> = {
  nome: "migliore-partita",
  descrizione:
    "Il migliore della partita votato dalla curva: cognome del vincitore gigante, percentuale sotto (solo se showPercent), punteggio piccolo in alto, eventuali 2° e 3° in una riga sottile in basso. showPercent va messo a false sotto i 30 votanti. Sfondo fotografico opzionale sotto un velo scuro: usalo come composizione {assetId, template} con una foto della libreria (ideale: il giocatore vincitore o la partita) — dà molta più vita del fondo piatto.",
  formato: "feed",
  schema,
  esempio: {
    homeTeam: "UNA Hotels Reggio Emilia",
    awayTeam: "Germani Brescia",
    homeScore: 95,
    awayScore: 88,
    date: "5 ottobre 2026",
    winner: { name: "Michele", surname: "Vitali", percent: 46, votes: 128 },
    runnersUp: [
      { surname: "Faye", percent: 27 },
      { surname: "Barford", percent: 12 },
    ],
    showPercent: true,
  },
  render,
};
