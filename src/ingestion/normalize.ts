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
