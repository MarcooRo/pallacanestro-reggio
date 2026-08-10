// Video dai feed RSS pubblici di YouTube (canali E playlist tematiche):
// niente API key, niente DB. La cache di Next (revalidate) basta: le
// fonti pubblicano poche volte al giorno. Feed giù = fonte assente.
//
// L'ordine di FONTI conta: è la priorità del dedup (un highlight sta
// sia nella playlist che nel canale LBA → vince il tag più specifico).

const FONTI = [
  {
    fonte: "pr_youtube",
    tag: "Reggiana",
    feed: "channel_id=UCSWK9ximwWQ56itm56CBT7A",
  },
  {
    fonte: "lba_highlights",
    tag: "Highlights LBA",
    feed: "playlist_id=PLY-s_C0dtivEf9Q1fgsIpUBgsR_sAL1it",
  },
  {
    fonte: "lba",
    tag: "Serie A",
    feed: "channel_id=UCKuhExlRMWgfcaD__HtN1yw",
  },
] as const;

export type FonteVideo = (typeof FONTI)[number]["fonte"];

export interface Video {
  videoId: string;
  fonte: FonteVideo;
  tag: string;
  titolo: string;
  publishedAt: Date;
  /** Sempre su i.ytimg.com (host stabile), derivata dal videoId */
  thumbnailUrl: string;
  /** Video 9:16 (Shorts/reel): il teatro lo apre in un box alto, non largo */
  verticale: boolean;
}

// Il feed è XML semplice e controllato: entry piatte, niente nesting.
// Un parser vero sarebbe una dipendenza in più per quattro campi.
function parseFeed(
  xml: string,
  fonte: (typeof FONTI)[number],
): Omit<Video, "verticale">[] {
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
          fonte: fonte.fonte,
          tag: fonte.tag,
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

// Né il feed né l'oEmbed dicono le proporzioni del video (l'oEmbed torna
// 200×113 pure per gli Shorts, verificato). L'unico segnale affidabile:
// /shorts/<id> risponde 200 solo per i veri Shorts, 303 per il resto.
// Cache lunga: un video non cambia natura. In dubbio (fonte giù):
// orizzontale, che è il caso normale.
async function eVerticale(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
      // Senza il cookie di consenso, dall'UE YouTube risponde 302 verso
      // consent.youtube.com per qualunque id e il segnale sparisce.
      headers: { cookie: "SOCS=CAI" },
      next: { revalidate: 86400 },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function feedFonte(fonte: (typeof FONTI)[number]): Promise<Video[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?${fonte.feed}`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return [];
    const video = parseFeed(await res.text(), fonte).sort(
      (a, b) => +b.publishedAt - +a.publishedAt,
    );
    return Promise.all(
      video.map(async (v) => ({ ...v, verticale: await eVerticale(v.videoId) })),
    );
  } catch {
    return [];
  }
}

function dedup(video: Video[]): Video[] {
  const visti = new Set<string>();
  return video.filter((v) =>
    visti.has(v.videoId) ? false : (visti.add(v.videoId), true),
  );
}

/** Tutti i video disponibili (i feed espongono gli ultimi ~15 a fonte). */
export async function getVideo(fonte?: FonteVideo): Promise<Video[]> {
  const fonti = fonte ? FONTI.filter((f) => f.fonte === fonte) : FONTI;
  const feeds = await Promise.all(fonti.map(feedFonte));
  // dedup PRIMA di ordinare: nell'ordine di FONTI vince il tag specifico
  return dedup(feeds.flat()).sort((a, b) => +b.publishedAt - +a.publishedAt);
}

/** Per la home: il più recente di ogni fonte, poi i 3 più freschi. */
export async function getVideoHome(): Promise<Video[]> {
  const feeds = await Promise.all(FONTI.map(feedFonte));
  return dedup(feeds.flatMap((f) => f.slice(0, 1)))
    .sort((a, b) => +b.publishedAt - +a.publishedAt)
    .slice(0, 3);
}
