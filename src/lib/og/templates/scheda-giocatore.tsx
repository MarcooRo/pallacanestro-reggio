// Scheda giocatore: tipografia e numeri, con foto opzionale. La foto NON
// sta sotto un velo a piena grafica (il volto dei ritratti cade in alto
// al centro, proprio dove andrebbe il cognome): è ancorata a destra e
// resta visibile, il testo vive nella colonna sinistra dove una sfumatura
// la fonde nel fondo scuro. I valori delle statistiche molto più grandi
// delle etichette: a 200px di larghezza si devono leggere i numeri.

import { z } from "zod";

import { branding } from "@/src/branding";

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

// Con la foto il cognome vive nella colonna sinistra (~60%): il corpo
// si calcola sullo spazio che ha davvero, mai sopra il volto.
function corpoCognome(cognome: string, conFoto: boolean): number {
  return conFoto
    ? Math.min(140, Math.floor(880 / cognome.length))
    : Math.min(160, Math.floor(1400 / cognome.length));
}

function render(p: Params) {
  const conFoto = Boolean(p.imageUrl);
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
      {p.imageUrl && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
          }}
        >
          {/* La foto occupa la metà destra, volto in alto e in vista */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.imageUrl}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "64%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
          {/* Fusione orizzontale: piena a sinistra sotto il testo,
              trasparente a destra dove la foto deve vedersi */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage:
                "linear-gradient(to right, rgba(11,11,12,1) 34%, rgba(11,11,12,0.55) 55%, rgba(11,11,12,0.05) 82%)",
            }}
          />
          {/* Zona statistiche: scurisce solo il terzo basso */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage:
                "linear-gradient(to top, rgba(11,11,12,0.92) 8%, rgba(11,11,12,0.6) 26%, rgba(11,11,12,0) 48%)",
            }}
          />
        </div>
      )}
      {/* Testata: numero e ruolo insieme a sinistra, mai sopra il volto */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 28,
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

      {/* Nome e cognome, nella colonna che il velo tiene scura */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 48,
          maxWidth: conFoto ? "62%" : "100%",
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
            fontSize: corpoCognome(p.surname, conFoto),
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
    "Scheda statistica di un giocatore: numero e ruolo in alto a sinistra, cognome gigante nella colonna sinistra, griglia di 3-5 statistiche in basso con valori molto grandi. subtitle opzionale (es. la partita o il periodo a cui si riferiscono i numeri). Foto opzionale ancorata a destra col volto in vista (composizione {assetId, template} con una foto del giocatore dalla libreria — molto meglio del fondo piatto): funziona al meglio con un ritratto verticale del giocatore.",
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
