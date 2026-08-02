// Video dai feed RSS pubblici di YouTube: niente API key, niente DB.
// La cache di Next (revalidate) basta: i canali pubblicano poche volte
// al giorno. Se un feed non risponde, la sezione sparisce senza rompere.
// Solo server: arriva ai client component già parsato (tipo Video).

const CANALI = [
  {
    fonte: "pr_youtube",
    canale: "Pallacanestro Reggiana",
    channelId: "UCSWK9ximwWQ56itm56CBT7A",
  },
  {
    fonte: "lba",
    canale: "Lega Basket",
    channelId: "UCKuhExlRMWgfcaD__HtN1yw",
  },
] as const;

export type FonteVideo = (typeof CANALI)[number]["fonte"];

export interface Video {
  videoId: string;
  fonte: FonteVideo;
  canale: string;
  titolo: string;
  publishedAt: Date;
  /** Sempre su i.ytimg.com (host stabile), derivata dal videoId */
  thumbnailUrl: string;
}

// Il feed è XML semplice e controllato: entry piatte, niente nesting.
// Un parser vero sarebbe una dipendenza in più per quattro campi.
function parseFeed(xml: string, canale: (typeof CANALI)[number]): Video[] {
  return xml
    .split("<entry>")
    .slice(1)
    .flatMap((entry) => {
      const videoId = entry.match(/<yt:videoId>([^<]+)</)?.[1];
      const titolo = entry.match(/<title>([^<]*)</)?.[1];
      const published = entry.match(/<published>([^<]+)</)?.[1];
      if (!videoId || !titolo || !published) return [];
      return [
        {
          videoId,
          fonte: canale.fonte,
          canale: canale.canale,
          titolo: decodificaEntita(titolo),
          publishedAt: new Date(published),
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        },
      ];
    });
}

function decodificaEntita(testo: string): string {
  return testo
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

async function feedCanale(canale: (typeof CANALI)[number]): Promise<Video[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${canale.channelId}`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return [];
    return parseFeed(await res.text(), canale);
  } catch {
    return [];
  }
}

/** Tutti i video disponibili (i feed espongono gli ultimi ~15 a canale). */
export async function getVideo(fonte?: FonteVideo): Promise<Video[]> {
  const canali = fonte ? CANALI.filter((c) => c.fonte === fonte) : CANALI;
  const feeds = await Promise.all(canali.map(feedCanale));
  return feeds.flat().sort((a, b) => +b.publishedAt - +a.publishedAt);
}

/**
 * Per la home: 3 video. L'ultimo di ciascun canale è garantito (LBA
 * pubblica molto più spesso di Reggio e la monopolizzerebbe), il terzo
 * è il più recente tra i rimanenti.
 */
export async function getVideoHome(): Promise<Video[]> {
  const feeds = await Promise.all(CANALI.map(feedCanale));
  const garantiti = feeds.flatMap((f) => f.slice(0, 1));
  const resto = feeds
    .flat()
    .filter((v) => !garantiti.includes(v))
    .sort((a, b) => +b.publishedAt - +a.publishedAt);
  return [...garantiti, ...resto.slice(0, 1)].sort(
    (a, b) => +b.publishedAt - +a.publishedAt,
  );
}
