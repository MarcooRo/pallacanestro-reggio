// La geometria del mezzo campo, in un posto solo. La leggono in tre: il
// quintetto della pagina squadra (src/components/campo-quintetto.tsx), il
// widget d'articolo e il template OG social. Tre disegni dello stesso
// campo liberi di divergere sarebbero tre campi diversi, e il campo è uno.
//
// Qui stanno solo i numeri: colori, spessori e tratteggio li decide chi
// disegna, perché in pagina sono variabili CSS e nell'immagine social no.
//
// Sistema di riferimento: viewBox 300×282 col canestro IN ALTO. Le
// coordinate dei giocatori seguono la stessa direzione — y=0 è il fondo
// sotto canestro, y=282 la linea di metà campo.

export const CAMPO_VIEWBOX = { larghezza: 300, altezza: 282 } as const;

/** Perimetro del mezzo campo e area dei tre secondi */
export const CAMPO_RETTANGOLI = [
  { x: 1, y: 1, width: 298, height: 280 },
  { x: 105, y: 1, width: 90, height: 87 },
] as const;

/**
 * Lunetta (la metà verso il canestro piena, l'altra tratteggiata come da
 * regolamento), arco da tre, cerchio di metà campo.
 */
export const CAMPO_ARCHI = [
  { d: "M120 88a30 30 0 0 0 60 0", tratteggiato: false },
  { d: "M120 88a30 30 0 0 1 60 0", tratteggiato: true },
  { d: "M27 1v22a123 123 0 0 0 246 0V1", tratteggiato: false },
  { d: "M114 281a36 36 0 0 1 72 0", tratteggiato: false },
] as const;

/** Tabellone e ferro: si disegnano con un colore diverso dalle linee */
export const CAMPO_TABELLONE = { x1: 132, y1: 12, x2: 168, y2: 12 } as const;
export const CAMPO_FERRO = { cx: 150, cy: 21, r: 6.5 } as const;

/** Il passo del tratteggio, in unità del viewBox */
export const CAMPO_TRATTEGGIO = "6 6";
