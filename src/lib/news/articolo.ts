// Corpo dell'articolo per la lettura in-app: si legge al volo dalla
// fonte (cache di un'ora), non si salva a database. L'HTML remoto si
// riduce a paragrafi di puro testo — niente markup di terzi renderizzato
// tal quale, quindi niente script, stili o banner cookie.

import type { news } from "@/src/db/schema";
import { getCorpoNewsLba } from "@/src/ingestion/sources/lba";
import { getCorpoWordPress } from "@/src/ingestion/sources/prwordpress";

const ENTITA: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  agrave: "à",
  egrave: "è",
  eacute: "é",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  Agrave: "À",
  Egrave: "È",
  Eacute: "É",
  Igrave: "Ì",
  Ograve: "Ò",
  Ugrave: "Ù",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  deg: "°",
};

function decodifica(testo: string): string {
  return testo
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, nome) => ENTITA[nome] ?? m);
}

// Da HTML a paragrafi: le chiusure dei blocchi (<p>, <h*>, <li>, ...)
// diventano confini di paragrafo, tutto il resto del markup cade.
function aParagrafi(html: string): string[] {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .split(/<\/(?:p|h[1-6]|li|blockquote|figcaption)>|<br\s*\/?>/i)
    .map((blocco) =>
      decodifica(blocco.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export async function getCorpoNews(
  item: typeof news.$inferSelect,
): Promise<string[] | null> {
  // Gli articoli nostri hanno il corpo su database (blocchi): non c'è
  // nessuna fonte da interrogare, li impagina CorpoArticolo.
  if (item.source === "redazione") return null;
  if (!item.sourceId) return null;
  try {
    const html =
      item.source === "pr_wordpress"
        ? await getCorpoWordPress(item.sourceId)
        : item.source === "lba"
          ? await getCorpoNewsLba(item.sourceId)
          : null;
    const paragrafi = html ? aParagrafi(html) : [];
    return paragrafi.length > 0 ? paragrafi : null;
  } catch {
    // Fonte giù: la pagina ripiega su estratto + link all'originale.
    return null;
  }
}
