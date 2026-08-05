// Etichette compatte per le testate delle partite. La fonte è verbosa
// ("Quarti di Finale - Gara  5", coi due spazi) e il nome della competizione
// porta l'annata, che nelle nostre pagine è già scritta altrove: su una riga
// da telefono quei caratteri sono lo spazio che serve al resto.

import type { PartitaLista } from "@/src/lib/partite/queries";

type Contesto = Pick<PartitaLista, "dayName" | "competitionName" | "typeCode">;

export function contestoPartita(partita: Contesto): string {
  const fase = (partita.dayName ?? "")
    .replace(/\s+/g, " ")
    .replace(/^Quarti di Finale/i, "Quarti")
    .replace(/ - Gara /i, " · Gara ")
    .trim();
  const competizione = partita.competitionName
    .replace(/\s+\d{4}(\/\d{2,4})?$/, "")
    // Sulla fascia del telefono "Basketball" è ridondante: Champions
    // League di basket, nella nostra app, non è ambiguo.
    .replace(/^Basketball Champions League$/, "Champions League");

  if (!fase) return competizione;
  // Campionato e playoff: la fase basta ("1° Giornata", "Finale · Gara 2").
  // Nelle coppe no: "Semifinali" da sole non dicono se è Supercoppa o
  // Coppa Italia, e il nome della competizione va tenuto.
  if (partita.typeCode === "RS" || partita.typeCode === "PO") return fase;
  return `${fase} · ${competizione}`;
}
