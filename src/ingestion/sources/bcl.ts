// Adapter per l'API FIBA (Basketball Champions League), individuata il
// 05/08/2026 sniffando championsleague.basketball. La chiave è PUBBLICA:
// sta nel bundle JS del sito, come il token WebSocket LBA. Gli id si
// risolvono a runtime; l'unica costante di vocabolario è il marketing
// name BCL, l'equivalente del cs_id=1 della Serie A.
//
// Attenzione: il SITO è dietro una protezione bot (403 senza User-Agent
// da browser); l'API accetta tutto purché ci siano chiave e User-Agent.

import type {
  CompetizioneBclCanonica,
  PartitaBclCanonica,
  SquadraBclCanonica,
  StatoPartita,
} from "@/src/ingestion/normalize";

const BASE_URL = "https://digital-api.fiba.basketball/hapi";
const SUBSCRIPTION_KEY = "898cd5e7389140028ecb42943c47eb74";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
const BCL_MARKETING_NAME_ID = 112;

// I loghi FIBA per organisation: variante "light" perché da noi stanno
// sulla placca chiara di LogoClub. URL pieno, non chiave CDN LBA.
function logoUrlFiba(organisationId: number): string {
  return `https://assets.fiba.basketball/image/upload/w_200/f_auto/q_auto/.logoflag--light--organisation_${organisationId}`;
}

async function fetchFiba<T>(path: string, revalidateSecondi?: number): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    headers: {
      accept: "application/json",
      "ocp-apim-subscription-key": SUBSCRIPTION_KEY,
      "user-agent": USER_AGENT,
    },
    ...(revalidateSecondi ? { next: { revalidate: revalidateSecondi } } : {}),
  });
  if (!res.ok) {
    throw new Error(`FIBA ${path}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---- Competizione ----

interface FibaCompetizione {
  competitionId: number;
  officialName: string;
  season: number;
  status: string;
}

// La BCL della stagione, se esiste (Reggio potrebbe non esserci l'anno
// dopo: in quel caso null, e il sync non ha nulla da fare).
// FIBA numera le stagioni con l'anno FINALE: la nostra 2026 è la loro 2027.
export async function getCompetizioneBcl(
  seasonYear: number,
): Promise<CompetizioneBclCanonica | null> {
  const annoFiba = seasonYear + 1;
  const competizioni = await fetchFiba<FibaCompetizione[]>(
    `getgdapcompetitionsbyseasonsandcompetitionmarketingname?seasons=${annoFiba}&competitionMarketingNameId=${BCL_MARKETING_NAME_ID}`,
  );
  const bcl = competizioni.find((c) => c.season === annoFiba);
  if (!bcl) return null;
  return {
    fibaCompetitionId: bcl.competitionId,
    seasonYear,
    name: bcl.officialName, // "Basketball Champions League", senza annata
  };
}

// ---- Squadre della competizione ----

interface FibaSquadraCompetizione {
  teamId: number;
  teamCode: string | null;
  shortName: string | null;
  profile: {
    organisationId: number;
    name: string | null;
  } | null;
}

export async function getSquadreBcl(
  fibaCompetitionId: number,
): Promise<SquadraBclCanonica[]> {
  const squadre = await fetchFiba<FibaSquadraCompetizione[]>(
    `getgdapcompetitionteamsbycompetitionid?gdapCompetitionId=${fibaCompetitionId}&profile=true`,
  );
  return squadre
    .filter((s) => s.profile?.organisationId)
    .map((s) => ({
      fibaTeamId: s.teamId,
      fibaOrganisationId: s.profile!.organisationId,
      nome: s.profile!.name || s.shortName || `Team ${s.teamId}`,
      logoUrl: logoUrlFiba(s.profile!.organisationId),
    }));
}

// ---- Partite di una squadra ----

interface FibaTeamRef {
  teamId: number;
  organisationId: number;
  officialName: string | null;
  shortName: string | null;
}

interface FibaGame {
  gameId: number;
  roundName: string | null;
  gameDay: number | null;
  statusCode: string;
  teamA: FibaTeamRef;
  teamB: FibaTeamRef;
  teamAScore: number;
  teamBScore: number;
  hostCity: string | null;
  venueName: string | null;
  gameDateTimeUTC: string; // senza suffisso Z
  buyTicketsURL: string | null;
  isPostponed: boolean;
}

// Stati FIBA (enum nel loro bundle: INIT, PROGR, VALID, CONFL, CLOS, N,
// DEL, CANCEL). I codici fuori mappa diventano 'scheduled' e vengono
// segnalati dal sync via statusCodeFonte, come i type_code LBA ignoti.
const STATO_DA_FIBA: Record<string, StatoPartita> = {
  INIT: "scheduled",
  PROGR: "live",
  VALID: "finished",
  CLOS: "finished",
  CANCEL: "cancelled",
};

// I codici con un mapping verificato: quelli fuori lista (CONFL, N, DEL,
// esistono nell'enum FIBA ma non li abbiamo mai visti su una gara) vanno
// segnalati dal sync, non ingoiati.
export const STATUS_CODE_BCL_VERIFICATI = new Set(Object.keys(STATO_DA_FIBA));

function squadraDaRef(ref: FibaTeamRef): SquadraBclCanonica {
  return {
    fibaTeamId: ref.teamId,
    fibaOrganisationId: ref.organisationId,
    nome: ref.officialName || ref.shortName || `Team ${ref.teamId}`,
    logoUrl: logoUrlFiba(ref.organisationId),
  };
}

export async function getPartiteBcl(
  fibaTeamId: number,
): Promise<PartitaBclCanonica[]> {
  const partite = await fetchFiba<FibaGame[]>(
    `getgdapgameswithleaderdetailsbyteamid?gdapTeamId=${fibaTeamId}`,
  );
  return partite.map((g) => {
    const status = g.isPostponed
      ? "postponed"
      : (STATO_DA_FIBA[g.statusCode] ?? "scheduled");
    const giocataOInCorso = status === "live" || status === "finished";
    return {
      fibaGameId: g.gameId,
      daySerial: g.gameDay,
      // Stesso formato del campionato; la competizione la dice l'etichetta
      dayName: g.gameDay ? `${g.gameDay}° Giornata` : (g.roundName ?? null),
      startsAt: new Date(`${g.gameDateTimeUTC}Z`),
      casa: squadraDaRef(g.teamA),
      ospite: squadraDaRef(g.teamB),
      status,
      statusCodeFonte: g.statusCode,
      // A gara non iniziata la fonte dice 0-0: da noi è "nessun punteggio"
      homeScore: giocataOInCorso ? g.teamAScore : null,
      awayScore: giocataOInCorso ? g.teamBScore : null,
      // La fonte porta spazi di troppo ("Enteria Arena ")
      venueName: g.venueName?.trim() || null,
      townName: g.hostCity?.trim() || null,
      ticketingUrl: g.buyTicketsURL || null,
    };
  });
}
