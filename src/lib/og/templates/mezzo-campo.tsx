// Mezzo campo con i giocatori piazzati a mano: un quintetto, uno schema,
// una situazione da raccontare. Le coordinate le scrive chi compone il
// post — questo template non legge nulla dal database, quindi il disegno
// dice esattamente ciò che gli si dà.
//
// Le linee del campo arrivano da src/lib/campo/geometria.ts, le stesse
// che disegnano il quintetto in pagina squadra e il widget d'articolo:
// qui cambiano solo i colori, che nell'immagine social non possono essere
// variabili CSS.
//
// Le linee sono un <img> con un data URI SVG e non un <svg> inline: a
// satori gli archi (tiro da tre, lunetta tratteggiata) arrivano così
// intatti, disegnati da resvg invece che approssimati con i bordi.

import { z } from "zod";

import { branding } from "@/src/branding";
import {
  CAMPO_ARCHI,
  CAMPO_FERRO,
  CAMPO_RETTANGOLI,
  CAMPO_TABELLONE,
  CAMPO_TRATTEGGIO,
  CAMPO_VIEWBOX,
} from "@/src/lib/campo/geometria";

import { DIMENSIONI, type TemplateOg } from "../tipi";

const schema = z.strictObject({
  titolo: z
    .string()
    .trim()
    .min(1)
    .max(70)
    .describe(
      'Sopra il campo, in grande: "Il quintetto che ha aperto la partita"',
    ),
  nota: z
    .string()
    .trim()
    .max(140)
    .optional()
    .describe(
      "Riga piccola sotto il campo: il contesto, o che cosa mostrano le posizioni",
    ),
  giocatori: z
    .array(
      z.strictObject({
        /** Come testo: "00" è un numero di maglia legittimo */
        numero: z.string().trim().min(1).max(3),
        cognome: z.string().trim().min(1).max(16),
        ruolo: z
          .string()
          .trim()
          .max(18)
          .optional()
          .describe(
            'Sotto il cognome, in piccolo: "Playmaker", "Centro". Si può omettere',
          ),
        x: z
          .number()
          .min(0)
          .max(100)
          .describe(
            "Da sinistra a destra: 0 = linea laterale sinistra, 100 = destra, 50 = centro",
          ),
        y: z
          .number()
          .min(0)
          .max(100)
          .describe(
            "Dal canestro alla metà campo: 0 = fondo campo sotto canestro, 100 = linea di metà campo. In area si sta intorno a 20, sull'arco da tre intorno a 55, in regia intorno a 85",
          ),
      }),
    )
    .min(1)
    .max(8)
    .describe(
      "Da 1 a 8 giocatori. Oltre, i cartellini si accavallano e non si legge più niente",
    ),
});

type Params = z.output<typeof schema>;

const { colori } = branding;
const attenuato = "rgba(255,255,255,0.55)";
const filo = "rgba(255,255,255,0.14)";

// Il campo occupa la larghezza utile meno i margini del cartellino più a
// bordo campo; l'altezza segue il rapporto 300:282 del viewBox.
const CAMPO_W = 872;
const CAMPO_H = Math.round(
  (CAMPO_W * CAMPO_VIEWBOX.altezza) / CAMPO_VIEWBOX.larghezza,
);
// Il cartellino: pastiglia col numero più cognome e ruolo, tutto centrato
// in una scatola di larghezza fissa. Larghezza fissa e non trasformazioni
// percentuali: così il centro è aritmetica, non un'incognita del layout.
const PEDINA = 96;
const CARTELLINO_W = 300;
// Quanto resta di tela a sinistra del campo: serve a non far uscire dal
// PNG il cartellino di chi sta a bordo campo.
const BORDO = (DIMENSIONI.feed.width - CAMPO_W) / 2;
// Aria minima fra un cartellino rientrato e il bordo del PNG
const ARIA = 24;

function tieni(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function corpoTitolo(titolo: string): number {
  return Math.min(88, Math.max(46, Math.floor(2700 / titolo.length)));
}

function campoSvg(): string {
  const { larghezza, altezza } = CAMPO_VIEWBOX;
  const rettangoli = CAMPO_RETTANGOLI.map(
    (r) =>
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`,
  ).join("");
  const archi = CAMPO_ARCHI.map(
    (a) =>
      `<path d="${a.d}"${a.tratteggiato ? ` stroke-dasharray="${CAMPO_TRATTEGGIO}"` : ""}/>`,
  ).join("");
  const { x1, y1, x2, y2 } = CAMPO_TABELLONE;
  const { cx, cy, r } = CAMPO_FERRO;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larghezza} ${altezza}" width="${CAMPO_W}" height="${CAMPO_H}">
<rect width="${larghezza}" height="${altezza}" fill="rgba(255,255,255,0.05)"/>
<g stroke="rgba(255,255,255,0.30)" stroke-width="2" fill="none">${rettangoli}${archi}</g>
<g stroke="${colori.vivo}" stroke-width="2.5" fill="none">
<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
<circle cx="${cx}" cy="${cy}" r="${r}"/>
</g>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function render(p: Params) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colori.scuro,
        color: "#ffffff",
        fontFamily: "Archivo",
        padding: "72px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: corpoTitolo(p.titolo),
          fontWeight: 800,
          textTransform: "uppercase",
          lineHeight: 1.02,
          letterSpacing: -1,
        }}
      >
        {p.titolo}
      </div>

      {/* Il campo, con i cartellini piazzati sopra in coordinate assolute */}
      <div
        style={{
          position: "relative",
          display: "flex",
          width: CAMPO_W,
          height: CAMPO_H,
          marginTop: 40,
          alignSelf: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={campoSvg()} width={CAMPO_W} height={CAMPO_H} alt="" />

        {p.giocatori.map((g, i) => {
          // La pastiglia sta esattamente sulle coordinate date: quella non
          // si sposta mai, sennò il disegno mentirebbe. Il cartellino sotto
          // è centrato sulla pastiglia ma rientra se sborderebbe dal PNG —
          // succede solo a bordo campo, e sono pochi pixel di scarto.
          const sinistra = (g.x / 100) * CAMPO_W - PEDINA / 2;
          const scarto = tieni(
            -(CARTELLINO_W - PEDINA) / 2,
            ARIA - BORDO - sinistra,
            DIMENSIONI.feed.width - CARTELLINO_W - BORDO - sinistra - ARIA,
          );
          return (
            <div
              key={`${g.numero}-${g.cognome}-${i}`}
              style={{
                position: "absolute",
                display: "flex",
                width: PEDINA,
                height: PEDINA,
                left: sinistra,
                top: (g.y / 100) * CAMPO_H - PEDINA / 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: PEDINA,
                  height: PEDINA,
                  borderRadius: PEDINA,
                  backgroundColor: colori.vivo,
                  color: colori.scuro,
                  border: `5px solid ${colori.scuro}`,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  fontWeight: 800,
                }}
              >
                {g.numero}
              </div>
              <div
                style={{
                  position: "absolute",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: CARTELLINO_W,
                  left: scarto,
                  top: PEDINA + 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "6px 14px",
                    backgroundColor: colori.scuro,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 32,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: -0.5,
                    }}
                  >
                    {g.cognome}
                  </div>
                  {g.ruolo && (
                    <div
                      style={{
                        display: "flex",
                        fontSize: 22,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: 3,
                        color: attenuato,
                        marginTop: 4,
                      }}
                    >
                      {g.ruolo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {p.nota && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              borderTop: `3px solid ${filo}`,
              paddingTop: 22,
              fontSize: 30,
              fontWeight: 500,
              color: attenuato,
            }}
          >
            {p.nota}
          </div>
        </div>
      )}
    </div>
  );
}

export const mezzoCampo: TemplateOg<Params> = {
  nome: "mezzo-campo",
  descrizione:
    "Mezzo campo da basket visto dall'alto, con i giocatori piazzati dove vuoi: un quintetto, uno schema, la disposizione di un possesso. Ogni giocatore è una pastiglia col numero, cognome e ruolo sotto. Le coordinate sono in percentuale sul mezzo campo: x da sinistra (0) a destra (100), y dal fondo sotto canestro (0) alla metà campo (100) — in area ~20, sull'arco da tre ~55, in regia ~85. I dati non arrivano dal database: numeri, cognomi e posizioni li scrivi tu, quindi vanno verificati. Esiste anche come widget d'articolo, stesso nome e stessi parametri, in list_article_blocks: quello è SVG in pagina e si adatta al telefono, questo è un PNG per i social.",
  formato: "feed",
  schema,
  esempio: {
    titolo: "Il quintetto che ha aperto a Brescia",
    nota: "Posizioni indicative: da dove ognuno ha tirato di più nel primo tempo.",
    giocatori: [
      { numero: "31", cognome: "Vitali", ruolo: "Playmaker", x: 50, y: 84 },
      { numero: "1", cognome: "Barford", ruolo: "Guardia", x: 17, y: 62 },
      { numero: "7", cognome: "Grant", ruolo: "Ala", x: 83, y: 62 },
      { numero: "24", cognome: "Smith", ruolo: "Ala grande", x: 27, y: 26 },
      { numero: "13", cognome: "Faye", ruolo: "Centro", x: 69, y: 21 },
    ],
  },
  render,
};
