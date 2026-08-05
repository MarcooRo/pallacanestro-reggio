// URL delle immagini CDN LBA. Pattern verificato il 31/07/2026
// ispezionando il sito: {cdn}/variants/{key}/{variant}.
// Esistono solo le varianti 'large' e 'thumb' (medium/small danno 403).

const CDN = "https://lba-media.s3.eu-south-1.amazonaws.com";

export function fotoUrl(
  key: string | null | undefined,
  variante: "large" | "thumb" = "thumb",
): string | null {
  if (!key) return null; // molti giovani non hanno foto: fallback a iniziali
  // Le squadre di coppa (BCL) hanno il logo su un CDN diverso: in quel
  // caso logo_key contiene l'URL pieno e passa così com'è.
  if (key.startsWith("https://")) return key;
  return `${CDN}/variants/${key}/${variante}`;
}
