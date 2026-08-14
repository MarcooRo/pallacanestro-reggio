// L'indirizzo assoluto del sito. Serve a metadataBase, canonical, sitemap
// e robots: sono le uniche cose che non possono dedurre l'host dalla
// richiesta, perché nascono anche fuori da una richiesta (build, crawler).
//
// Ordine: quello che dici tu, poi il dominio di produzione che Vercel
// espone da sé, poi il locale. IMPORTANTE: appena c'è un dominio vero va
// messo NEXT_PUBLIC_SITE_URL su Vercel, altrimenti i canonical puntano al
// sottodominio vercel.app e il dominio nuovo resta senza autorità.

export function urlSito(): string {
  const esplicito = process.env.NEXT_PUBLIC_SITE_URL;
  if (esplicito) return esplicito.replace(/\/+$/, "");

  // Il dominio di produzione stabile del progetto (non l'URL del singolo
  // deploy, che cambia a ogni push e non va mai in un canonical).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
