// Etichette italiane degli stati di un articolo, per le pagine admin.
// I valori canonici stanno nello schema (news_status_check).

export const ORDINE_STATI_ARTICOLO = ["draft", "published", "archived"] as const;

export const NOME_STATO_ARTICOLO: Record<string, string> = {
  draft: "Bozze",
  published: "Pubblicati",
  archived: "Archiviati",
};

// 'Redazione' tiene distinti gli articoli nostri dalle news ufficiali del
// club ('Pallacanestro Reggiana'): il lettore non deve poterli confondere.
export const nomeFonte: Record<string, string> = {
  lba: "Lega Basket",
  pr_wordpress: "Pallacanestro Reggiana",
  redazione: "Redazione",
};

/** Le fonti "di casa": in lista si riconoscono dal filo rosso a sinistra. */
export function fonteDiCasa(source: string): boolean {
  return source === "pr_wordpress" || source === "redazione";
}
