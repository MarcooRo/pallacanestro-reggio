// Etichette italiane degli stati e delle piattaforme, condivise dalle
// pagine admin. I valori canonici stanno nello schema (check constraint).

export const ORDINE_STATI = [
  "draft",
  "approved",
  "publishing",
  "published",
  "failed",
  "archived",
] as const;

export const NOME_STATO: Record<string, string> = {
  draft: "Bozze",
  approved: "Approvati",
  publishing: "In pubblicazione",
  published: "Pubblicati",
  failed: "Falliti",
  archived: "Archiviati",
};

export const NOME_PIATTAFORMA: Record<string, string> = {
  instagram_feed: "Instagram · feed",
  instagram_story: "Instagram · story",
};
