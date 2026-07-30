// Adapter per l'API interna di legabasket.it (PROJECT_RE.md, sezione 6).
// Qui e SOLO qui vive il vocabolario LBA: verso l'esterno escono i tipi
// canonici di normalize.ts. Forme delle risposte verificate il 30/07/2026.

import type {
  CompetizioneCanonica,
  GiocatoreCanonico,
  PartitaCanonica,
  PermanenzaCanonica,
  SquadraStagioneCanonica,
  StatoPartita,
} from "@/src/ingestion/normalize";

const BASE_URL = "https://www.legabasket.it/api";

async function fetchLba<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`LBA ${path}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---- Competizioni ----

interface LbaChampionship {
  id: number;
  year: number;
  full_name: string;
  ctype_code: string;
  cserie_code: string;
  logo_key: string | null;
}

// type_code verificati contro l'API il 30/07/2026. La lista NON è un filtro:
// serve a segnalare in ingestion_runs i valori mai visti prima (sezione 7.5),
// così un tipo nuovo si scopre dal log e non da una classifica sbagliata.
export const TYPE_CODE_VERIFICATI = new Set(["RS", "PO", "SI", "CI", "FIN", "GIRON"]);

function versoCanonico(c: LbaChampionship): CompetizioneCanonica {
  return {
    lbaChampionshipId: c.id,
    seasonYear: c.year,
    seriesCode: c.cserie_code,
    typeCode: c.ctype_code,
    name: c.full_name,
    logoKey: c.logo_key,
  };
}

export async function getCompetizioniCorrenti(): Promise<CompetizioneCanonica[]> {
  const data = await fetchLba<{ competitions: LbaChampionship[] }>(
    "championships/get-championships?current=1",
  );
  return data.competitions.map(versoCanonico);
}

// Tutte le competizioni di una stagione, di ogni serie (anche giovanili:
// le scarta il seed, a valle, in base alle squadre riconciliabili).
export async function getCompetizioniStagione(
  anno: number,
): Promise<CompetizioneCanonica[]> {
  const data = await fetchLba<{ competitions: LbaChampionship[] }>(
    `championships/get-championships?s=${anno}&items=1000`,
  );
  return data.competitions.map(versoCanonico);
}

// ---- Squadre-stagione ----

interface LbaTeam {
  id: number;
  name: string;
  year: number;
  club_id: number;
  club_code: string | null;
  logo_key: string | null;
}

export async function getSquadreStagione(
  year: number,
): Promise<SquadraStagioneCanonica[]> {
  const data = await fetchLba<{ teams: LbaTeam[] }>(
    `teams/get-teams?year=${year}&items=50`,
  );
  return data.teams.map((t) => ({
    lbaTeamId: t.id,
    lbaClubId: t.club_id,
    seasonYear: t.year,
    displayName: t.name,
    lbaClubCode: t.club_code,
    logoKey: t.logo_key,
  }));
}

// ---- Roster ----

interface LbaRosterPlayer {
  id: number;
  name: string;
  surname: string;
  code: string | null;
  place_of_birth: string | null;
  birth_date: string | null;
  player_number: string | null;
  country: string | null;
  uefa_ratio: string | null;
  height: number | null;
  weight: number | null;
  start_date: string;
  end_date: string | null;
  player_role_id: number | null;
  player_role: string | null;
  player_picture_key: string | null;
}

export async function getRoster(lbaTeamId: number): Promise<{
  giocatori: GiocatoreCanonico[];
  permanenze: PermanenzaCanonica[];
}> {
  const data = await fetchLba<{ players: LbaRosterPlayer[] }>(
    `teams/get-team-roster?id=${lbaTeamId}`,
  );

  const giocatori = data.players.map<GiocatoreCanonico>((p) => ({
    lbaPlayerId: p.id,
    lbaCode: p.code,
    firstName: p.name,
    lastName: p.surname,
    birthDate: p.birth_date,
    birthPlace: p.place_of_birth,
    nationality: p.country,
    heightCm: p.height,
    weightKg: p.weight,
    photoKey: p.player_picture_key, // null per molti giovani
  }));

  const permanenze = data.players.map<PermanenzaCanonica>((p) => ({
    lbaPlayerId: p.id,
    lbaTeamId,
    startDate: p.start_date,
    endDate: p.end_date,
    jerseyNumber: p.player_number,
    role: p.player_role,
    roleId: p.player_role_id,
    uefaRatio: p.uefa_ratio,
  }));

  return { giocatori, permanenze };
}

// ---- Calendario ----

interface LbaCalendarMatch {
  id: number;
  game_status: string;
  match_datetime: string;
  home_final_score: number | null;
  visitor_final_score: number | null;
  additional_time: number | null;
  ticketing_url: string | null;
  has_streaming: number | boolean;
  websocket_match_id: string | null;
  h_team_id: number;
  v_team_id: number;
  plant_name: string | null;
  town_name: string | null;
  day_serial: number | null;
  day_name: string | null;
}

interface LbaCalendarResponse {
  matches: LbaCalendarMatch[];
  referees: Record<string, string[]>;
  filters: { phases?: { id: number }[] };
}

// Mappatura prudente di game_status: "2" è verificato come "giocata".
// Gli altri valori vanno confermati appena osservati (sezione 7.5: mai
// fidarsi dei nomi/valori della fonte senza verifica).
function statoPartita(m: LbaCalendarMatch): StatoPartita {
  if (m.game_status === "2") return "finished";
  if (m.game_status === "1") return "live";
  return "scheduled";
}

async function getCalendarioFase(
  lbaChampionshipId: number,
  phaseId: number,
): Promise<{ partite: PartitaCanonica[]; fasi: number[] }> {
  const data = await fetchLba<LbaCalendarResponse>(
    `championships/get-championships-calendar-by-id?id=${lbaChampionshipId}&ph_id=${phaseId}`,
  );

  const partite = data.matches.map<PartitaCanonica>((m) => ({
    lbaMatchId: m.id,
    lbaChampionshipId,
    phaseId,
    daySerial: m.day_serial,
    dayName: m.day_name,
    startsAt: new Date(m.match_datetime),
    homeLbaTeamId: m.h_team_id,
    awayLbaTeamId: m.v_team_id,
    status: statoPartita(m),
    homeScore: m.home_final_score,
    awayScore: m.visitor_final_score,
    additionalTime: m.additional_time ?? 0,
    venueName: m.plant_name,
    townName: m.town_name,
    referees: data.referees?.[String(m.id)] ?? null,
    ticketingUrl: m.ticketing_url,
    hasStreaming: Boolean(m.has_streaming),
    websocketMatchId: m.websocket_match_id,
  }));

  const fasi = (data.filters?.phases ?? []).map((p) => p.id);
  return { partite, fasi };
}

// Una chiamata per fase (non per giornata). Le fasi si scoprono dalla
// risposta stessa: nessun elenco scritto nel codice.
export async function getCalendario(
  lbaChampionshipId: number,
): Promise<PartitaCanonica[]> {
  const prima = await getCalendarioFase(lbaChampionshipId, 1);
  const partite = new Map<number, PartitaCanonica>();
  for (const p of prima.partite) partite.set(p.lbaMatchId, p);

  for (const faseId of prima.fasi.filter((id) => id !== 1)) {
    const { partite: altre } = await getCalendarioFase(lbaChampionshipId, faseId);
    for (const p of altre) partite.set(p.lbaMatchId, p);
  }

  return [...partite.values()];
}
