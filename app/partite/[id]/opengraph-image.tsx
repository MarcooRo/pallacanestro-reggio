// Immagine OG della partita: la pagella se pubblicata, altrimenti l'invito
// al voto. È il canale di crescita: il link su WhatsApp mostra questa.

import { ImageResponse } from "next/og";

import { branding } from "@/src/branding";
import { fotoUrl } from "@/src/lib/immagini";
import { getPagella, getPartita } from "@/src/lib/partite/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "La pagella della curva";

const { colori } = branding;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partita = await getPartita(id);
  if (!partita) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", background: colori.primario }} />,
      size,
    );
  }

  const pagella =
    partita.votingState === "tallied" ? (await getPagella(id)).slice(0, 3) : [];
  const punteggio =
    partita.status === "finished"
      ? `${partita.homeScore} – ${partita.awayScore}`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: colori.primario,
          color: colori.onPrimario,
          fontSize: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, opacity: 0.9 }}>
            {branding.appName} · {partita.competitionName}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800 }}>
              {partita.homeTeam} – {partita.awayTeam}
            </div>
            {punteggio && (
              <div style={{ display: "flex", fontSize: 46, fontWeight: 800 }}>{punteggio}</div>
            )}
          </div>
        </div>

        {pagella.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, opacity: 0.9 }}>
              La pagella della curva
            </div>
            {pagella.map((r, i) => {
              const foto = fotoUrl(r.photoKey, "thumb");
              return (
                <div
                  key={r.playerId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    background: i === 0 ? colori.onPrimario : "rgba(255,255,255,0.14)",
                    color: i === 0 ? colori.scuro : colori.onPrimario,
                    borderRadius: 18,
                    padding: "14px 28px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 34, fontWeight: 800, width: 40 }}>
                    {i + 1}
                  </div>
                  {foto ? (
                    <img
                      src={foto}
                      alt=""
                      width={64}
                      height={64}
                      style={{ borderRadius: 999, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 64,
                        height: 64,
                        borderRadius: 999,
                        background: colori.tinta,
                        color: colori.primario,
                        fontSize: 26,
                        fontWeight: 800,
                      }}
                    >
                      {r.firstName[0]}
                      {r.lastName[0]}
                    </div>
                  )}
                  <div style={{ display: "flex", flex: 1, fontSize: 36, fontWeight: 700 }}>
                    {r.firstName} {r.lastName}
                  </div>
                  <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
                    {r.performancePoints} pt
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
            {partita.votingState === "open"
              ? "Vota il migliore in campo →"
              : branding.tagline}
          </div>
        )}
      </div>
    ),
    size,
  );
}
