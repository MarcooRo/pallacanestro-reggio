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
