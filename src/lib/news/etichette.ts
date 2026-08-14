// Etichette italiane degli stati di un articolo, per le pagine admin.
// I valori canonici stanno nello schema (news_status_check).

export const ORDINE_STATI_ARTICOLO = ["draft", "published", "archived"] as const;

export const NOME_STATO_ARTICOLO: Record<string, string> = {
  draft: "Bozze",
  published: "Pubblicati",
  archived: "Archiviati",
};
