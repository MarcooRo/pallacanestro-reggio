// Il mezzo campo dentro un articolo: i giocatori dove li mette chi
// scrive. Serve a far vedere una disposizione — un quintetto, uno schema,
// da dove è arrivato un possesso — che a parole richiede tre righe.
//
// Le linee sono le stesse del quintetto in pagina squadra e del template
// OG social (src/lib/campo/geometria.ts). Qui però è SVG in pagina, non
// un PNG: si ridimensiona col telefono e i colori restano variabili CSS.
//
// Nessun dato dal database: cognomi, numeri e posizioni li scrive chi
// compone l'articolo. È come numeri-chiave — comodo e da verificare.

import { Fragment, type CSSProperties } from "react";
import { z } from "zod";

import {
  CAMPO_ARCHI,
  CAMPO_FERRO,
  CAMPO_RETTANGOLI,
  CAMPO_TABELLONE,
  CAMPO_TRATTEGGIO,
  CAMPO_VIEWBOX,
} from "@/src/lib/campo/geometria";
import type { GraficoArticolo } from "@/src/lib/news/grafici/tipi";

const schema = z.strictObject({
  titolo: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe(
      "Riga sopra il campo. Si può omettere se lo dice già il testo qui accanto",
    ),
  nota: z
    .string()
    .trim()
    .max(140)
    .optional()
    .describe(
      "Didascalia sotto il campo: il contesto, o che cosa mostrano le posizioni",
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
      "Da 1 a 8 giocatori. Oltre, su un telefono i cartellini si accavallano e non si legge più niente",
    ),
});

type Params = z.output<typeof schema>;

/**
 * Il cartellino col cognome è centrato sulla pastiglia, ma a bordo campo
 * si aggancia al lato del campo: centrato uscirebbe dalla colonna del
 * testo, che su un telefono è tutto lo schermo. La pastiglia invece sta
 * sempre esattamente sulle coordinate date — quella non si sposta, sennò
 * il disegno mentirebbe.
 *
 * 1.25rem = il raggio della pastiglia più un filo d'aria.
 */
function posizioneCartellino(x: number, y: number): CSSProperties {
  const top = `calc(${y}% + 1.25rem)`;
  if (x < 12) return { left: 0, top };
  if (x > 88) return { right: 0, top };
  return { left: `${x}%`, top, transform: "translateX(-50%)" };
}

export const mezzoCampo: GraficoArticolo<Params, undefined> = {
  nome: "mezzo-campo",
  descrizione:
    "Mezzo campo da basket visto dall'alto, con i giocatori piazzati dove vuoi: un quintetto, uno schema, la disposizione di un possesso. Ogni giocatore è una pastiglia col numero, cognome e ruolo sotto. Le coordinate sono in percentuale sul mezzo campo: x da sinistra (0) a destra (100), y dal fondo sotto canestro (0) alla metà campo (100) — in area ~20, sull'arco da tre ~55, in regia ~85. I dati non arrivano dal database: numeri, cognomi e posizioni li scrivi tu, quindi vanno verificati. Esiste anche come grafica social, stesso nome, in list_og_templates.",
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
  render: (p) => (
    <figure className="my-1 flex flex-col gap-1.5">
      {p.titolo && <figcaption className="eyebrow">{p.titolo}</figcaption>}

      {/* pb-8: l'aria in cui sbordano i cartellini di chi sta sulla linea di
          metà campo. Sta fuori dal riquadro del campo, sennò falserebbe le
          percentuali con cui i giocatori sono piazzati */}
      <div className="w-full pb-8">
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${CAMPO_VIEWBOX.larghezza} ${CAMPO_VIEWBOX.altezza}`}
            className="block w-full"
            aria-hidden
          >
            <rect
              width={CAMPO_VIEWBOX.larghezza}
              height={CAMPO_VIEWBOX.altezza}
              fill="var(--superficie)"
            />
            <g stroke="var(--linea-forte)" strokeWidth="2" fill="none">
              {CAMPO_RETTANGOLI.map((r) => (
                <rect key={`${r.x}-${r.y}`} {...r} />
              ))}
              {CAMPO_ARCHI.map((a) => (
                <path
                  key={a.d}
                  d={a.d}
                  strokeDasharray={
                    a.tratteggiato ? CAMPO_TRATTEGGIO : undefined
                  }
                />
              ))}
            </g>
            <g stroke="var(--brand-vivid)" strokeWidth="2.5" fill="none">
              <line {...CAMPO_TABELLONE} />
              <circle {...CAMPO_FERRO} />
            </g>
          </svg>

          {p.giocatori.map((g, i) => (
            <Fragment key={`${g.numero}-${g.cognome}-${i}`}>
              {/* Percentuali e non px: il campo non ha una larghezza propria,
                  gliela dà la colonna del testo */}
              <span
                className="score absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-brand-vivid text-xs font-bold text-on-brand"
                style={{ left: `${g.x}%`, top: `${g.y}%` }}
              >
                {g.numero}
              </span>
              <span
                className="absolute flex flex-col items-center bg-background/85 px-1 py-0.5"
                style={posizioneCartellino(g.x, g.y)}
              >
                <span className="text-[11px] leading-tight font-bold uppercase whitespace-nowrap">
                  {g.cognome}
                </span>
                {g.ruolo && (
                  <span className="text-[9px] leading-tight tracking-wider text-muted uppercase whitespace-nowrap">
                    {g.ruolo}
                  </span>
                )}
              </span>
            </Fragment>
          ))}
        </div>
      </div>

      {p.nota && (
        <figcaption className="text-xs text-muted">{p.nota}</figcaption>
      )}
    </figure>
  ),
};
