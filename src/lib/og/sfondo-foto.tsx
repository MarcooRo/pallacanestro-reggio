// Lo sfondo fotografico opzionale dei template tipografici: la foto a
// piena grafica sotto un velo scuro quasi pieno, più carico in basso dove
// di solito c'è più testo. Il velo NON è parametrizzabile, come lo scrim
// di foto-con-testo: la tipografia resta la protagonista e deve leggersi
// su qualunque foto, chiara o scura.
//
// Va reso come PRIMO figlio di un contenitore position:relative: satori
// disegna i fratelli successivi sopra di lui.

export function SfondoFoto({ url }: { url: string }) {
  return (
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
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
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage:
            "linear-gradient(to bottom, rgba(11,11,12,0.78), rgba(11,11,12,0.92))",
        }}
      />
    </div>
  );
}
