// Rilancio di una notizia CON PAROLE NOSTRE: tipografia su fondo scuro,
// così si cita la fonte senza ripubblicarne le foto di agenzia. La fonte
// va in piccolo in fondo, sempre. Lo sfondo fotografico opzionale NON
// cambia la regola: solo foto NOSTRE dalla libreria, mai della fonte.

import { z } from "zod";

import { branding } from "@/src/branding";

import { SfondoFoto } from "../sfondo-foto";
import type { TemplateOg } from "../tipi";

const schema = z.strictObject({
  /** Foto di sfondo opzionale, sotto un velo scuro: SOLO foto nostre
      dalla libreria, mai foto della fonte. In una composizione
      {assetId, template} si compila da solo con l'url dell'asset. */
  imageUrl: z.url().optional(),
  /** Riga piccola sopra il testo, es. "MERCATO" o "SERIE A" */
  overline: z.string().min(1),
  /** Il contenuto, riscritto con parole nostre: MAI il testo della fonte */
  text: z.string().min(1).max(280),
  /** La testata da citare, es. "La Gazzetta dello Sport" */
  source: z.string().min(1),
});

type Params = z.output<typeof schema>;

const { colori } = branding;
const attenuato = "rgba(255,255,255,0.55)";
const filo = "rgba(255,255,255,0.14)";

function corpoTesto(text: string): number {
  return Math.min(84, Math.max(48, Math.floor(6200 / text.length)));
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
        padding: "72px 80px",
      }}
    >
      {p.imageUrl && <SfondoFoto url={p.imageUrl} />}
      <div
        style={{
          display: "flex",
          fontSize: 34,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 6,
          color: colori.vivo,
        }}
      >
        {p.overline}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: corpoTesto(p.text),
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.08,
          }}
        >
          {p.text}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `3px solid ${filo}`,
          paddingTop: 28,
          fontSize: 26,
          fontWeight: 500,
          color: attenuato,
        }}
      >
        {`fonte: ${p.source}`}
      </div>
    </div>
  );
}

export const citazioneNotizia: TemplateOg<Params> = {
  nome: "citazione-notizia",
  descrizione:
    "Rilancio testuale di una notizia letta altrove, riscritta con parole nostre: overline d'accento, testo grande su fondo scuro, testata citata in piccolo in fondo. Il campo text va riscritto, mai copiato dalla fonte. Sfondo fotografico opzionale sotto un velo scuro, SOLO con foto nostre della libreria (composizione {assetId, template}): serve a dare vita alla grafica senza MAI ripubblicare foto di agenzia o della fonte.",
  formato: "feed",
  schema,
  esempio: {
    overline: "Mercato",
    text: "Un play americano nel mirino: contatti avviati, si chiude entro la settimana",
    source: "La Gazzetta dello Sport",
  },
  render,
};
