// Strato branding sostituibile (PROJECT_RE.md, sezione 11).
// Tutti gli asset e i testi legati al brand passano da qui.
// I nomi delle squadre invece arrivano SEMPRE da team_seasons.display_name.

export type BrandingMode = "official" | "generic";

const mode: BrandingMode =
  process.env.BRANDING === "generic" ? "generic" : "official";

interface Branding {
  mode: BrandingMode;
  /** Nome dell'app mostrato in header, metadata e PWA */
  appName: string;
  appShortName: string;
  tagline: string;
  /** Path del logo in /public; null = fallback tipografico */
  logoUrl: string | null;
}

// Il nome è volutamente identico nei due modi: finisce nel dominio, nel
// manifest PWA e nei link condivisi, quindi deve sopravvivere a un eventuale
// passaggio official → generic. Solo colori, asset e tagline cambiano.
const configs: Record<BrandingMode, Branding> = {
  official: {
    mode: "official",
    appName: "La Pagella",
    appShortName: "Pagella",
    tagline: "Il migliore in campo lo decide la curva",
    logoUrl: null,
  },
  generic: {
    mode: "generic",
    appName: "La Pagella",
    appShortName: "Pagella",
    tagline: "Il migliore in campo lo decidi tu",
    logoUrl: null,
  },
};

export const branding = configs[mode];
