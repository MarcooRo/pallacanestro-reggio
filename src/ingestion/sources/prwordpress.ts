// Adapter per il WordPress della società (PROJECT_RE.md, sezione 6).
// Confine: a database vanno solo titolo, estratto, data, categoria,
// immagine e link. Il corpo si legge al volo per la lettura in-app
// (getCorpoWordPress), mai salvato, sempre citando la fonte.

import type { NewsCanonica } from "@/src/ingestion/normalize";

const BASE_URL = "https://www.pallacanestroreggiana.it/wp-json/wp/v2";

interface WpPost {
  id: number;
  date_gmt: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string }[];
    "wp:term"?: { taxonomy: string; name: string }[][];
  };
}

// L'excerpt arriva come HTML: si tiene solo il testo.
function pulisciHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\[…\]|\[&hellip;\]|&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

// Il corpo dell'articolo, per la lettura in-app: letto al volo con la
// cache di Next, non passa mai dal database.
export async function getCorpoWordPress(
  sourceId: string,
): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/posts/${sourceId}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const post = (await res.json()) as { content?: { rendered?: string } };
  return post.content?.rendered || null;
}

export async function getNewsWordPress(items = 20): Promise<NewsCanonica[]> {
  const res = await fetch(`${BASE_URL}/posts?per_page=${items}&_embed=1`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`WordPress posts: HTTP ${res.status}`);
  }
  const posts = (await res.json()) as WpPost[];

  return posts.map((p) => {
    const categorie = (p._embedded?.["wp:term"] ?? [])
      .flat()
      .filter((t) => t.taxonomy === "category")
      .map((t) => t.name);

    return {
      source: "pr_wordpress",
      sourceId: String(p.id),
      title: pulisciHtml(p.title.rendered),
      url: p.link,
      excerpt: pulisciHtml(p.excerpt.rendered) || null,
      // "Tutte le news" è un contenitore, non una categoria informativa
      category: categorie.find((c) => c !== "Tutte le news") ?? categorie[0] ?? null,
      imageUrl: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
      publishedAt: new Date(`${p.date_gmt}Z`),
    };
  });
}
