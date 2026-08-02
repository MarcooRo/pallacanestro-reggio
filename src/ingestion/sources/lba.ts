// Adapter per l'API interna di legabasket.it (PROJECT_RE.md, sezione 6).
// Qui e SOLO qui vive il vocabolario LBA: verso l'esterno escono i tipi
// canonici di normalize.ts. Forme delle risposte verificate il 30/07/2026.

import type {
  CompetizioneCanonica,
  GiocatoreCanonico,
  NewsCanonica,
  PartitaCanonica,
  PermanenzaCanonica,
  RigaTabellinoCanonica,
  SquadraStagioneCanonica,
  StatoPartita,
  TabellinoCanonico,
} from "@/src/ingestion/normalize";

const BASE_URL = "https://www.legabasket.it/api";
const SITE_URL = "https://www.legabasket.it";

// revalidateSecondi: cache del fetch di Next per le letture a render
// (es. statistiche giocatore). Ignorato fuori da Next (script di seed).
async function fetchLba<T>(path: string, revalidateSecondi?: number): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    headers: { accept: "application/json" },
    ...(revalidateSecondi ? { next: { revalidate: revalidateSecondi } } : {}),
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

export async function getRoster(
  lbaTeamId: number,
  revalidateSecondi?: number,
): Promise<{
  giocatori: GiocatoreCanonico[];
  permanenze: PermanenzaCanonica[];
}> {
  const data = await fetchLba<{ players: LbaRosterPlayer[] }>(
    `teams/get-team-roster?id=${lbaTeamId}`,
    revalidateSecondi,
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

// ---- Statistiche di stagione del giocatore ----
// Verificate il 31/07/2026 contro l'API (sezione 7.5): points_sum/played
// quadra con points_avg; rating_oer_sum contiene una MEDIA, non una somma;
// avg_points_sum significa altro e si ignora. I valori _avg arrivano come
// stringhe. Le chiavi sono totals_highs_{comp} / avg_{comp} (rs, po, ...).

interface LbaTotali {
  played_matches_sum: number;
  quintet_sum: number;
  points_sum: number;
  played_minutes_sum: number;
  shots_2p_realized_sum: number;
  shots_2p_total_sum: number;
  shots_3p_realized_sum: number;
  shots_3p_total_sum: number;
  free_throws_realized_sum: number;
  free_throws_total_sum: number;
  offensive_rebound_sum: number;
  defensive_rebound_sum: number;
  assists_sum: number;
  regain_balls_sum: number;
  lost_balls_sum: number;
  ball_stop_given_sum: number;
  ball_stop_received_sum: number;
  done_fouls_sum: number;
  suffered_fouls_sum: number;
  slam_dunk_sum: number;
  rating_lega_sum: number;
  rating_oer_sum: number; // in realtà una media (sezione 7.5)
  points_max: number;
  rating_lega_max: number;
}

interface LbaMedie {
  points_avg: string;
  played_minutes_avg: string;
  rating_lega_avg: string;
  assists_avg: string;
}

export interface StatisticheStagione {
  competizione: string; // 'RS' | 'PO' | ... dal suffisso della chiave
  partite: number;
  quintetti: number;
  punti: number;
  minuti: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  rebOff: number;
  rebDef: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  blocksReceived: number;
  foulsCommitted: number;
  foulsReceived: number;
  dunks: number;
  rating: number;
  oer: number;
  puntiMedia: number;
  minutiMedia: number;
  ratingMedia: number;
  assistMedia: number;
  puntiMax: number;
  ratingMax: number;
}

export async function getStatisticheGiocatore(
  lbaPlayerId: number,
): Promise<StatisticheStagione[]> {
  const data = await fetchLba<{ stats: Record<string, unknown> }>(
    `players/get-player-by-id?id=${lbaPlayerId}&stats=true`,
    3600, // cache 1h: lettura a render, non ingestion
  );

  const stagioni: StatisticheStagione[] = [];
  for (const [chiave, valore] of Object.entries(data.stats ?? {})) {
    const suffisso = chiave.match(/^totals_highs_(\w+)$/)?.[1];
    if (!suffisso || !valore) continue;
    const t = valore as LbaTotali;
    const medie = (data.stats[`avg_${suffisso}`] ?? {}) as LbaMedie;

    stagioni.push({
      competizione: suffisso.toUpperCase(),
      partite: t.played_matches_sum,
      quintetti: t.quintet_sum,
      punti: t.points_sum,
      minuti: t.played_minutes_sum,
      fg2m: t.shots_2p_realized_sum,
      fg2a: t.shots_2p_total_sum,
      fg3m: t.shots_3p_realized_sum,
      fg3a: t.shots_3p_total_sum,
      ftm: t.free_throws_realized_sum,
      fta: t.free_throws_total_sum,
      rebOff: t.offensive_rebound_sum,
      rebDef: t.defensive_rebound_sum,
      assists: t.assists_sum,
      steals: t.regain_balls_sum,
      turnovers: t.lost_balls_sum,
      blocks: t.ball_stop_given_sum,
      blocksReceived: t.ball_stop_received_sum,
      foulsCommitted: t.done_fouls_sum,
      foulsReceived: t.suffered_fouls_sum,
      dunks: t.slam_dunk_sum,
      rating: t.rating_lega_sum,
      oer: t.rating_oer_sum,
      puntiMedia: Number(medie.points_avg ?? 0),
      minutiMedia: Number(medie.played_minutes_avg ?? 0),
      ratingMedia: Number(medie.rating_lega_avg ?? 0),
      assistMedia: Number(medie.assists_avg ?? 0),
      puntiMax: t.points_max,
      ratingMax: t.rating_lega_max,
    });
  }
  return stagioni;
}

// ---- News LBA ----

interface LbaContenuto {
  id: number;
  title: string;
  publication_date: string;
  abstract: string | null;
  seo_description: string | null;
  permalink: string;
  category_label: string | null;
  main_image_key: string | null;
}

export async function getNewsLba(
  lbaChampionshipId: number,
  items = 20,
): Promise<NewsCanonica[]> {
  const data = await fetchLba<{ contents: LbaContenuto[] }>(
    `contents/get-contents?c_id=${lbaChampionshipId}&c_type=news&items=${items}`,
  );
  return data.contents.map((c) => ({
    source: "lba",
    sourceId: String(c.id),
    title: c.title,
    // pattern URL verificato sull'HTML del sito: /news/{id}/{permalink}
    url: `${SITE_URL}/news/${c.id}/${c.permalink}`,
    excerpt: c.seo_description || c.abstract || null,
    category: c.category_label,
    imageUrl: c.main_image_key
      ? `https://lba-media.s3.eu-south-1.amazonaws.com/variants/${c.main_image_key}/large`
      : null,
    publishedAt: new Date(c.publication_date),
  }));
}

// ---- Tabellino per partita ----
// Endpoint individuato il 31/07/2026 con la sonda della sezione 6:
// championships/get-championships-matches-by-id?id={lba_match_id}.
// ATTENZIONE: questo endpoint parla italiano ("pun", "rimbalzi_o",
// "val_lega") — vocabolario diverso dagli altri, mappato SOLO qui.
// Verifica 7.5: somme per-partita incrociate con i totali di stagione
// (script di backfill) — "sec" sono i secondi giocati totali,
// "sf" = "1" quintetto base, "sc" = schiacciate.

interface LbaRigaTabellino {
  player_id: number;
  player_num: number | null;
  player_surname: string;
  player_name: string;
  player_p_key: string | null;
  pun: number;
  sec: number;
  sf: string | null;
  falli_c: number;
  falli_sf: number;
  t2_r: number;
  t2_t: number;
  sc: number;
  t3_r: number;
  t3_t: number;
  tl_r: number;
  tl_t: number;
  rimbalzi_o: number;
  rimbalzi_d: number;
  stoppate_dat: number;
  stoppate_sub: number;
  palle_p: number;
  palle_r: number;
  ass: number;
  val_lega: number;
  val_oer: number;
  plus_minus: number;
}

interface LbaTabellinoResponse {
  match: {
    game_status: string;
    home_final_score: number | null;
    visitor_final_score: number | null;
    additional_time: number | null;
    q1_hs: number; q1_vs: number;
    q2_hs: number; q2_vs: number;
    q3_hs: number; q3_vs: number;
    q4_hs: number; q4_vs: number;
    ot_hs: number; ot_vs: number;
  };
  scores: {
    ht?: { rows?: LbaRigaTabellino[] };
    vt?: { rows?: LbaRigaTabellino[] };
  } | null;
}

function versoRigaCanonica(
  r: LbaRigaTabellino,
  lato: "home" | "away",
): RigaTabellinoCanonica {
  return {
    lbaPlayerId: r.player_id,
    firstName: r.player_name,
    lastName: r.player_surname,
    photoKey: r.player_p_key,
    jerseyNumber: r.player_num === null ? null : String(r.player_num),
    lato,
    starter: r.sf === "1",
    minutes: Math.round((r.sec / 60) * 10) / 10,
    points: r.pun,
    fg2m: r.t2_r,
    fg2a: r.t2_t,
    fg3m: r.t3_r,
    fg3a: r.t3_t,
    ftm: r.tl_r,
    fta: r.tl_t,
    dunks: r.sc,
    rebOff: r.rimbalzi_o,
    rebDef: r.rimbalzi_d,
    assists: r.ass,
    steals: r.palle_r,
    turnovers: r.palle_p,
    blocks: r.stoppate_dat,
    blocksReceived: r.stoppate_sub,
    foulsCommitted: r.falli_c,
    foulsReceived: r.falli_sf,
    plusMinus: r.plus_minus,
    rating: r.val_lega,
    oer: r.val_oer,
  };
}

export async function getTabellino(
  lbaMatchId: number,
  revalidateSecondi?: number,
): Promise<TabellinoCanonico> {
  const data = await fetchLba<LbaTabellinoResponse>(
    `championships/get-championships-matches-by-id?id=${lbaMatchId}`,
    revalidateSecondi,
  );
  const m = data.match;

  const parziali: TabellinoCanonico["parziali"] = {
    q1: { h: m.q1_hs, v: m.q1_vs },
    q2: { h: m.q2_hs, v: m.q2_vs },
    q3: { h: m.q3_hs, v: m.q3_vs },
    q4: { h: m.q4_hs, v: m.q4_vs },
  };
  if ((m.additional_time ?? 0) > 0 || m.ot_hs > 0 || m.ot_vs > 0) {
    parziali.ot = { h: m.ot_hs, v: m.ot_vs };
  }

  return {
    lbaMatchId,
    status: m.game_status === "2" ? "finished" : m.game_status === "1" ? "live" : "scheduled",
    homeScore: m.home_final_score,
    awayScore: m.visitor_final_score,
    additionalTime: m.additional_time ?? 0,
    parziali,
    righe: [
      ...(data.scores?.ht?.rows ?? []).map((r) => versoRigaCanonica(r, "home")),
      ...(data.scores?.vt?.rows ?? []).map((r) => versoRigaCanonica(r, "away")),
    ],
  };
}

// ---- Classifica campionato ----
// Endpoint individuato il 02/08/2026 nei chunk del sito:
// championships/get-championship-ranking?id={championship}&d={giornata}.
// Senza "d" standings è null: la giornata va indicata, e per quelle non
// ancora giocate torna null/vuoto — il chiamante passa l'ultima giocata.

interface LbaRigaClassifica {
  team_id: number;
  team_name: string;
  logo_key: string | null;
  position: number;
  points: number;
  penalty_points: number;
  wins: number;
  defeats: number;
  game_played: number;
  points_made: number;
  points_suffered: number;
  day_name: string | null;
}

export interface RigaClassifica {
  lbaTeamId: number;
  teamName: string;
  logoKey: string | null;
  position: number;
  points: number;
  penaltyPoints: number;
  wins: number;
  defeats: number;
  gamesPlayed: number;
  pointsMade: number;
  pointsSuffered: number;
}

export async function getClassifica(
  lbaChampionshipId: number,
  giornata: number,
  revalidateSecondi?: number,
): Promise<{ giornata: string | null; righe: RigaClassifica[] } | null> {
  const data = await fetchLba<{ standings: LbaRigaClassifica[] | null }>(
    `championships/get-championship-ranking?id=${lbaChampionshipId}&d=${giornata}`,
    revalidateSecondi,
  );
  if (!data.standings?.length) return null;
  return {
    giornata: data.standings[0].day_name,
    righe: data.standings.map((r) => ({
      lbaTeamId: r.team_id,
      teamName: r.team_name,
      logoKey: r.logo_key,
      position: r.position,
      points: r.points,
      penaltyPoints: r.penalty_points,
      wins: r.wins,
      defeats: r.defeats,
      gamesPlayed: r.game_played,
      pointsMade: r.points_made,
      pointsSuffered: r.points_suffered,
    })),
  };
}
