// Formattazione date in italiano, sempre nel fuso di Reggio Emilia:
// il fuso va esplicitato perché il server (Vercel) gira in UTC.

const FUSO = "Europe/Rome";

export function dataOra(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function soloOra(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(d);
}

// Solo l'orologio: si usa dove la data è già scritta accanto (il centro
// del tabellone nella card partita).
export function orario(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Data compatta per la testata delle card: senza anno (la stagione la si è
// già scelta a monte) e senza orologio quando la fonte non conosce ancora la
// palla a due — la LBA pubblica quelle partite a mezzanotte, e "00:00" letto
// su una card sembra un orario vero.
export function dataBreve(d: Date): string {
  const giorno = new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  const ora = orario(d);
  return ora === "00:00" ? giorno : `${giorno} · ${ora}`;
}

// Interpreta una stringa datetime-local (input admin, senza fuso) come ora
// di Reggio Emilia. Il server gira in UTC: senza questa conversione "18:30"
// programmato dall'admin diventerebbe le 18:30 UTC, cioè le 20:30 italiane.
export function dataDaRoma(locale: string): Date {
  const conSecondi = locale.length === 16 ? `${locale}:00` : locale;
  const ipotetica = new Date(`${conSecondi}Z`); // come se fosse UTC
  const romana = new Date(ipotetica.toLocaleString("en-US", { timeZone: FUSO }));
  const anticipo = romana.getTime() - ipotetica.getTime(); // quanto Roma è avanti sull'UTC
  return new Date(ipotetica.getTime() - anticipo);
}

export function nomeMese(meseIso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO,
    month: "long",
    year: "numeric",
  }).format(new Date(`${meseIso}T12:00:00Z`));
}

export function etichettaStagione(anno: number): string {
  return `${anno}-${String((anno + 1) % 100).padStart(2, "0")}`;
}
