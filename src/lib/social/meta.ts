// Client minimo della Meta Graph API per la pubblicazione (fase 2).
// Fetch nudo, nessuna dipendenza. La configurazione vive nel .env:
// META_PAGE_ID e META_PAGE_ACCESS_TOKEN accendono Facebook, META_IG_USER_ID
// (quando il collegamento Instagram↔Pagina sarà fatto) accende Instagram.
// Senza i primi due il publisher resta spento e la coda non si tocca.
//
// Il flusso Instagram è quello documentato da Meta: si crea un "container"
// per ogni immagine (l'API scarica il JPEG dal nostro URL pubblico), si
// aspetta che sia FINISHED e si pubblica. I container non sono istantanei,
// da qui l'attesa con poll. Facebook invece è un colpo solo per la foto
// singola; per l'album si caricano le foto non pubblicate e si crea il
// post che le raccoglie.

const GRAPH = "https://graph.facebook.com/v23.0";

export interface ConfigMeta {
  pageId: string;
  /** null finché Instagram non è collegato alla Pagina */
  igUserId: string | null;
  token: string;
}

export function configMeta(): ConfigMeta | null {
  const pageId = process.env.META_PAGE_ID?.trim();
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!pageId || !token) return null;
  return { pageId, token, igUserId: process.env.META_IG_USER_ID?.trim() || null };
}

async function graph<T>(
  metodo: "GET" | "POST",
  percorso: string,
  token: string,
  parametri: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${GRAPH}/${percorso}`);
  const coppie = new URLSearchParams({ ...parametri, access_token: token });

  const risposta =
    metodo === "GET"
      ? await fetch(`${url}?${coppie}`, { cache: "no-store" })
      : await fetch(url, { method: "POST", body: coppie });

  const dati = (await risposta.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: number; error_subcode?: number } })
    | null;

  if (!dati || dati.error || !risposta.ok) {
    const e = dati?.error;
    throw new Error(
      e
        ? `Graph API ${percorso}: ${e.message} (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})`
        : `Graph API ${percorso}: HTTP ${risposta.status}`,
    );
  }
  return dati;
}

const attesa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

// Un container Instagram va pubblicato solo quando è FINISHED: appena
// creato è IN_PROGRESS mentre Meta scarica e valida l'immagine.
async function attendiContainer(id: string, token: string): Promise<void> {
  for (let giro = 0; giro < 10; giro++) {
    const { status_code } = await graph<{ status_code: string }>(
      "GET",
      id,
      token,
      { fields: "status_code" },
    );
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") {
      throw new Error(`container ${id} in errore (Meta non ha accettato l'immagine)`);
    }
    await attesa(3000);
  }
  throw new Error(`container ${id} non pronto dopo 30 secondi`);
}

export interface EsitoMeta {
  externalId: string;
  permalink: string | null;
}

/** Feed (singola o carosello) e story. Le immagini sono URL JPEG pubblici. */
export async function pubblicaSuInstagram(
  config: ConfigMeta,
  input: { urls: string[]; caption: string; story: boolean },
): Promise<EsitoMeta> {
  if (!config.igUserId) throw new Error("META_IG_USER_ID non configurato");
  const ig = config.igUserId;

  let creationId: string;
  if (input.story) {
    ({ id: creationId } = await graph<{ id: string }>("POST", `${ig}/media`, config.token, {
      media_type: "STORIES",
      image_url: input.urls[0],
    }));
  } else if (input.urls.length === 1) {
    ({ id: creationId } = await graph<{ id: string }>("POST", `${ig}/media`, config.token, {
      image_url: input.urls[0],
      caption: input.caption,
    }));
  } else {
    const figli: string[] = [];
    for (const url of input.urls) {
      const { id } = await graph<{ id: string }>("POST", `${ig}/media`, config.token, {
        image_url: url,
        is_carousel_item: "true",
      });
      await attendiContainer(id, config.token);
      figli.push(id);
    }
    ({ id: creationId } = await graph<{ id: string }>("POST", `${ig}/media`, config.token, {
      media_type: "CAROUSEL",
      children: figli.join(","),
      caption: input.caption,
    }));
  }

  await attendiContainer(creationId, config.token);
  const { id: mediaId } = await graph<{ id: string }>(
    "POST",
    `${ig}/media_publish`,
    config.token,
    { creation_id: creationId },
  );

  // Il permalink delle story non è esposto: pazienza, resta l'id.
  let permalink: string | null = null;
  if (!input.story) {
    try {
      ({ permalink } = await graph<{ permalink: string }>("GET", mediaId, config.token, {
        fields: "permalink",
      }));
    } catch {
      permalink = null;
    }
  }
  return { externalId: mediaId, permalink };
}

/** Foto singola o album sulla Pagina. */
export async function pubblicaSuFacebook(
  config: ConfigMeta,
  input: { urls: string[]; caption: string },
): Promise<EsitoMeta> {
  if (input.urls.length === 1) {
    const { id, post_id } = await graph<{ id: string; post_id?: string }>(
      "POST",
      `${config.pageId}/photos`,
      config.token,
      { url: input.urls[0], message: input.caption },
    );
    const postId = post_id ?? id;
    return { externalId: postId, permalink: `https://www.facebook.com/${postId}` };
  }

  // Album: foto caricate non pubblicate, poi un post che le raccoglie
  const fbids: string[] = [];
  for (const url of input.urls) {
    const { id } = await graph<{ id: string }>(
      "POST",
      `${config.pageId}/photos`,
      config.token,
      { url, published: "false" },
    );
    fbids.push(id);
  }
  const parametri: Record<string, string> = { message: input.caption };
  fbids.forEach((fbid, i) => {
    parametri[`attached_media[${i}]`] = JSON.stringify({ media_fbid: fbid });
  });
  const { id } = await graph<{ id: string }>(
    "POST",
    `${config.pageId}/feed`,
    config.token,
    parametri,
  );
  return { externalId: id, permalink: `https://www.facebook.com/${id}` };
}
