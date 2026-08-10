// Template di composizione: una foto della libreria con sopra un titolo.
// Lo scrim in basso NON è opzionale e non è parametrizzabile: senza, il
// testo diventa illeggibile appena la foto ha un'area chiara, ed è
// l'errore che rende dilettantesche il 90% delle grafiche di questo tipo.

import { z } from "zod";

import { branding } from "@/src/branding";

import type { TemplateOg } from "../tipi";

const schema = z.strictObject({
  /** URL pubblico della foto, di norma l'url di un media_asset (list_media) */
  imageUrl: z.url(),
  /** Riga piccola sopra il titolo, nel colore d'accento, es. "PalaBigi · 5 ottobre" */
  overline: z.string().optional(),
  headline: z.string().min(1),
  /** Riga piccola sotto il titolo, es. il credito della foto */
  footnote: z.string().optional(),
});

type Params = z.output<typeof schema>;

const { colori } = branding;
const attenuato = "rgba(255,255,255,0.7)";

function corpoTitolo(headline: string): number {
  return Math.min(96, Math.max(56, Math.floor(2600 / headline.length)));
}

function render(p: Params) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: colori.scuro,
        fontFamily: "Archivo",
        color: "#ffffff",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.imageUrl}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* Scrim: da trasparente a quasi pieno sull'ultimo 55% dell'altezza */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: "55%",
          backgroundImage:
            "linear-gradient(to bottom, rgba(11,11,12,0), rgba(11,11,12,0.92))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "0 80px 72px",
        }}
      >
        {p.overline && (
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 6,
              color: colori.vivo,
              marginBottom: 24,
            }}
          >
            {p.overline}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: corpoTitolo(p.headline),
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.02,
          }}
        >
          {p.headline}
        </div>
        {p.footnote && (
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 500,
              color: attenuato,
              marginTop: 28,
            }}
          >
            {p.footnote}
          </div>
        )}
      </div>
    </div>
  );
}

export const fotoConTesto: TemplateOg<Params> = {
  nome: "foto-con-testo",
  descrizione:
    "Una foto (di norma dalla libreria media, vedi list_media) a piena grafica con un titolo sopra, in stile coerente col canale: overline nel colore d'accento, titolo grande, scrim scuro in basso per la leggibilità. Per foto pubblicate con un contesto testuale forte; per la foto nuda usa un media item kind=asset senza template.",
  formato: "feed",
  schema,
  esempio: {
    imageUrl: "https://esempio.supabase.co/storage/v1/object/public/media/palabigi.jpg",
    overline: "PalaBigi · 5 ottobre",
    headline: "La curva non si è seduta mai",
    footnote: "foto: Pallacanestro Reggiana",
  },
  render,
};
