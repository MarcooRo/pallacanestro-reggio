// Strato branding sostituibile (PROJECT_RE.md, sezione 11).
// Tutti gli asset e i testi legati al brand passano da qui.
// I nomi delle squadre invece arrivano SEMPRE da team_seasons.display_name.

export type BrandingMode = "official" | "generic";

const mode: BrandingMode =
  process.env.BRANDING === "generic" ? "generic" : "official";

interface Branding {
  mode: BrandingMode;
  /** Nome dell'app mostrato in metadata e PWA */
  appName: string;
  appShortName: string;
  /** Nome nell'header: abbreviato, deve stare su una riga a 390px */
  appHeaderName: string;
  /** Dichiarazione che l'app non è del club: nell'header è il timbro pixelato */
  disclaimer: string;
  tagline: string;
  /** Path del logo in /public; null = fallback tipografico */
  logoUrl: string | null;
  /**
   * Palette per i contesti dove il CSS non arriva (immagini OG generate
   * server-side). Tenere allineata a tokens.css: è l'unica altra copia.
   */
  colori: {
    primario: string;
    vivo: string;
    onPrimario: string;
    scuro: string;
    tinta: string;
  };
}

// Il nome è volutamente identico nei due modi: finisce nel dominio, nel
// manifest PWA e nei link condivisi, quindi deve sopravvivere a un eventuale
// passaggio official → generic. Solo colori, asset e tagline cambiano.
const configs: Record<BrandingMode, Branding> = {
  official: {
    mode: "official",
    appName: "Pallacanestro Reggiana",
    appShortName: "Reggiana",
    appHeaderName: "Pall. Reggiana",
    disclaimer: "unofficial",
    tagline: "Segui Reggio: news, partite e la pagella della curva",
    logoUrl: null,
    colori: {
      primario: "#c8102e",
      vivo: "#ff2440",
      onPrimario: "#ffffff",
      scuro: "#0b0b0c",
      tinta: "#2a0d13",
    },
  },
  generic: {
    mode: "generic",
    appName: "Pallacanestro Reggiana",
    appShortName: "Reggiana",
    appHeaderName: "Pall. Reggiana",
    disclaimer: "unofficial",
    tagline: "Segui la tua squadra: news, partite e pagelle",
    logoUrl: null,
    colori: {
      primario: "#2563eb",
      vivo: "#60a5fa",
      onPrimario: "#ffffff",
      scuro: "#0b0b0c",
      tinta: "#101a33",
    },
  },
};

export const branding = configs[mode];
