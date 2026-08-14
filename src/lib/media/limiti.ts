// I tetti di dimensione dell'upload, in un unico posto. Li leggono
// next.config.ts (bodySizeLimit delle server action) e la pagina
// /admin/media, che così può dirlo all'admin PRIMA di far partire un
// upload che il server rifiuterebbe con un errore illeggibile.

export const MB = 1024 * 1024;

/** Corpo massimo di una server action: vale per TUTTE le foto insieme. */
export const LIMITE_UPLOAD_MB = 25;

/** Tetto per una singola immagine scaricata da un URL esterno. */
export const LIMITE_IMPORT_MB = 20;
