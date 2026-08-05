// Tipi canonici dell'ingestion. Ogni adapter (lba, prwordpress, highlightly)
// parla la lingua della sua fonte ed emette QUESTI tipi: il resto del sistema
// non sa da dove arrivano i dati.

export interface CompetizioneCanonica {
  lbaChampionshipId: number;
  seasonYear: number;
  seriesCode: string; // 'A1'
  typeCode: string; // 'RS' | 'PO' | 'SI' | ...
  name: string;
  logoKey: string | null;
}

export interface SquadraStagioneCanonica {
  lbaTeamId: number;
  lbaClubId: number;
  seasonYear: number;
  displayName: string;
  lbaClubCode: string | null; // NON stabile tra stagioni
  logoKey: string | null;
}

// La coppa europea (BCL) vive nel vocabolario FIBA: id propri, niente LBA.
export interface CompetizioneBclCanonica {
  fibaCompetitionId: number;
  seasonYear: number; // 2026 = stagione 2026-27 (FIBA la chiama "2027")
  name: string;
}

export interface SquadraBclCanonica {
  fibaTeamId: number;
  fibaOrganisationId: number;
  nome: string;
  logoUrl: string | null;
}

export interface PartitaBclCanonica {
  fibaGameId: number;
  daySerial: number | null;
  dayName: string | null;
  startsAt: Date;
  casa: SquadraBclCanonica;
  ospite: SquadraBclCanonica;
  status: StatoPartita;
  statusCodeFonte: string; // per segnalare i codici mai visti
  homeScore: number | null;
  awayScore: number | null;
  venueName: string | null;
  townName: string | null;
  ticketingUrl: string | null;
}

export interface GiocatoreCanonico {
  lbaPlayerId: number;
  lbaCode: string | null;
  firstName: string;
  lastName: string;
  birthDate: string | null; // ISO yyyy-mm-dd
  birthPlace: string | null;
  nationality: string | null; // alpha3
  heightCm: number | null;
  weightKg: number | null;
  photoKey: string | null;
}

export interface PermanenzaCanonica {
  lbaPlayerId: number;
  lbaTeamId: number;
  startDate: string;
  endDate: string | null;
  jerseyNumber: string | null;
  role: string | null;
  roleId: number | null;
  uefaRatio: string | null;
}

export type StatoPartita =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

// Una riga del tabellino, già in vocabolario canonico.
export interface RigaTabellinoCanonica {
  lbaPlayerId: number;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  jerseyNumber: string | null;
  lato: "home" | "away";
  starter: boolean;
  minutes: number; // con decimali, dai secondi giocati
  points: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  dunks: number;
  rebOff: number;
  rebDef: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  blocksReceived: number;
  foulsCommitted: number;
  foulsReceived: number;
  plusMinus: number;
  rating: number;
  oer: number;
}

export interface TabellinoCanonico {
  lbaMatchId: number;
  status: StatoPartita;
  homeScore: number | null;
  awayScore: number | null;
  additionalTime: number;
  // {"q1":{"h":25,"v":21},...,"ot":{...}} — solo i periodi giocati
  parziali: Record<string, { h: number; v: number }>;
  righe: RigaTabellinoCanonica[];
}

export interface NewsCanonica {
  source: "lba" | "pr_wordpress";
  sourceId: string;
  title: string;
  url: string; // si linka SEMPRE alla fonte, mai ripubblicato il testo
  excerpt: string | null;
  category: string | null;
  imageUrl: string | null;
  publishedAt: Date;
}

export interface PartitaCanonica {
  lbaMatchId: number;
  lbaChampionshipId: number;
  phaseId: number | null;
  daySerial: number | null;
  dayName: string | null;
  startsAt: Date;
  homeLbaTeamId: number;
  awayLbaTeamId: number;
  status: StatoPartita;
  homeScore: number | null;
  awayScore: number | null;
  additionalTime: number;
  venueName: string | null;
  townName: string | null;
  referees: string[] | null;
  ticketingUrl: string | null;
  hasStreaming: boolean;
  websocketMatchId: string | null;
}
