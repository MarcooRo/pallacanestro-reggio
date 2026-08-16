// Il pannello da tabellone: uno, due o tre numeri grandi con la loro
// etichetta. È l'unico widget in cui i valori li scrive chi compone
// l'articolo — serve proprio per i numeri che non stanno a database (una
// media di lega, una striscia, un dato di contesto). Per il tabellino di
// una partita c'è il widget che legge il dato vero.

import { z } from "zod";

import type { GraficoArticolo } from "@/src/lib/news/grafici/tipi";

const schema = z.strictObject({
  voci: z
    .array(
      z.strictObject({
        valore: z
          .string()
          .trim()
          .min(1)
          .max(8)
          .describe('Il numero come si legge: "21", "58%", "+12", "3-0"'),
        etichetta: z
          .string()
          .trim()
          .min(1)
          .max(28)
          .describe('Cosa misura: "punti di Faye", "da tre in stagione"'),
      }),
    )
    .min(1)
    .max(3)
    .describe("Da 1 a 3 numeri affiancati. Tre è il massimo leggibile su telefono"),
  nota: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe("Riga piccola sotto: il contesto o la fonte del dato"),
});

type Params = z.output<typeof schema>;

export const numeriChiave: GraficoArticolo<Params, undefined> = {
  nome: "numeri-chiave",
  descrizione:
    "Da uno a tre numeri grandi in stile tabellone, con etichetta e nota. Da usare per i dati che non stanno nel nostro database (medie di lega, strisce, confronti storici): i valori li scrivi tu, quindi vanno verificati. Per le statistiche di una nostra partita usa invece il widget tabellino, che legge il dato vero.",
  schema,
  esempio: {
    voci: [
      { valore: "21", etichetta: "punti di Faye" },
      { valore: "58%", etichetta: "da due di squadra" },
      { valore: "+12", etichetta: "a rimbalzo" },
    ],
    nota: "Dati della partita di domenica al PalaBigi",
  },
  render: (p) => (
    <figure className="my-1 flex flex-col gap-1.5">
      <div className="tabellone taglio flex flex-col">
        <div className="flex divide-x divide-border">
          {p.voci.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
              <span className="score text-4xl leading-none font-bold text-brand-vivid">
                {v.valore}
              </span>
              <span className="eyebrow text-center !text-[0.625rem] leading-tight">
                {v.etichetta}
              </span>
            </div>
          ))}
        </div>
      </div>
      {p.nota && <figcaption className="text-xs text-muted">{p.nota}</figcaption>}
    </figure>
  ),
};
