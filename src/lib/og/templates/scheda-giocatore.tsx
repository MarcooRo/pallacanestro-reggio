// Scheda giocatore: solo tipografia e numeri, nessuna foto. I valori
// delle statistiche molto più grandi delle etichette: a 200px di
// larghezza si devono leggere i numeri, le etichette sono contorno.

import { z } from "zod";

import { branding } from "@/src/branding";

import { SfondoFoto } from "../sfondo-foto";
import type { TemplateOg } from "../tipi";

const schema = z.strictObject({
  /** Foto di sfondo opzionale, sotto un velo scuro. In una composizione
      {assetId, template} si compila da solo con l'url dell'asset. */
  imageUrl: z.url().optional(),
  name: z.string(),
  surname: z.string().min(1),
  /** Come testo: "00" è un numero di maglia legittimo */
  number: z.string().min(1),
  role: z.string().min(1),
  stats: z
    .array(
      z.strictObject({
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .min(3)
    .max(5),
  subtitle: z.string().optional(),
});

type Params = z.output<typeof schema>;

const { colori } = branding;
const attenuato = "rgba(255,255,255,0.55)";
const filo = "rgba(255,255,255,0.14)";

function corpoCognome(cognome: string): number {
  return Math.min(160, Math.floor(1400 / cognome.length));
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
      {/* Testata: numero e ruolo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            color: colori.vivo,
          }}
        >
          {`#${p.number}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 6,
            color: attenuato,
          }}
        >
          {p.role}
        </div>
      </div>

      {/* Nome e cognome */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 48,
        }}
      >
        {p.name && (
          <div
            style={{
              display: "flex",
              fontSize: 50,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            {p.name}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: corpoCognome(p.surname),
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 0.95,
          }}
        >
          {p.surname}
        </div>
        {p.subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 500,
              color: attenuato,
              marginTop: 20,
            }}
          >
            {p.subtitle}
          </div>
        )}
      </div>

      {/* Griglia delle statistiche: valori enormi, etichette piccole */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "flex-end",
          gap: 28,
        }}
      >
        {p.stats.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              flexDirection: "column",
              flexBasis: "30%",
              flexGrow: 1,
              borderTop: `3px solid ${filo}`,
              paddingTop: 24,
            }}
          >
            <div style={{ display: "flex", fontSize: 112, fontWeight: 800, lineHeight: 1 }}>
              {s.value}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: attenuato,
                marginTop: 10,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const schedaGiocatore: TemplateOg<Params> = {
  nome: "scheda-giocatore",
  descrizione:
    "Scheda statistica di un giocatore: numero e ruolo in alto, cognome gigante, griglia di 3-5 statistiche con valori molto grandi. subtitle opzionale (es. la partita o il periodo a cui si riferiscono i numeri). Sfondo fotografico opzionale sotto un velo scuro: usalo come composizione {assetId, template} con una foto del giocatore dalla libreria — molto meglio del fondo piatto quando la foto c'è.",
  formato: "feed",
  schema,
  esempio: {
    name: "Jaylen",
    surname: "Barford",
    number: "1",
    role: "Guardia",
    stats: [
      { label: "Punti", value: "18.4" },
      { label: "Assist", value: "4.2" },
      { label: "Rimbalzi", value: "3.8" },
      { label: "Da tre", value: "41%" },
      { label: "Valutazione", value: "19.1" },
    ],
    subtitle: "Media stagione 2026-27",
  },
  render,
};
