// Un errore "da tool": il messaggio arriva all'AI com'è (isError: true).
// Vive da solo perché lo lanciano sia il layer MCP sia i service condivisi.

export class ErroreTool extends Error {}
