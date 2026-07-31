// Schema canonico del progetto (PROJECT_RE.md, sezione 8).
// Nomi canonici: la mappatura dal vocabolario LBA vive negli adapter, non qui.
// Convenzione: proprietà camelCase → colonne snake_case (casing: 'snake_case').

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ============ ANAGRAFICHE ============

// Entità stabile nel tempo. Chiave canonica del progetto (Reggio = club_id LBA 44).
export const clubs = pgTable(
  "clubs",
  {
    id: uuid().primaryKey().defaultRandom(),
    lbaClubId: integer().unique(),
    name: text().notNull(),
    shortName: text().notNull(),
    isHomeClub: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Al più un club "di casa"
    uniqueIndex("clubs_home_club_unique").on(t.isHomeClub).where(sql`is_home_club`),
  ],
);

// Una riga per club per stagione: nome commerciale e team_id LBA cambiano ogni anno.
export const teamSeasons = pgTable(
  "team_seasons",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id),
    seasonYear: integer().notNull(), // 2026 = stagione 2026-27
    lbaTeamId: integer().notNull(), // 1760 per Reggio 2026
    displayName: text().notNull(), // "UNA Hotels Reggio Emilia"
    lbaClubCode: text(), // NON stabile tra stagioni, solo informativo
    logoKey: text(),
  },
  (t) => [
    unique("team_seasons_club_season_unique").on(t.clubId, t.seasonYear),
    unique("team_seasons_lba_team_id_unique").on(t.lbaTeamId),
  ],
);

export const players = pgTable("players", {
  id: uuid().primaryKey().defaultRandom(),
  lbaPlayerId: integer().unique(), // id LBA (Vitali = 5834)
  lbaCode: text(), // "VIT-MIC", stabile e leggibile
  firstName: text().notNull(),
  lastName: text().notNull(),
  birthDate: date(),
  birthPlace: text(),
  nationality: text(), // alpha3: ITA, USA, SEN
  heightCm: integer(),
  weightKg: integer(),
  photoKey: text(), // null per molti giovani: fallback a iniziali
  manualOverride: boolean().notNull().default(false),
});

// Permanenza di un giocatore in una squadra-stagione, con validità temporale.
// Risponde a "chi era in rosa alla data della partita X".
export const playerStints = pgTable(
  "player_stints",
  {
    id: uuid().primaryKey().defaultRandom(),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamSeasonId: uuid()
      .notNull()
      .references(() => teamSeasons.id, { onDelete: "cascade" }),
    startDate: date().notNull(),
    endDate: date(),
    jerseyNumber: text(), // NON univoco nella squadra
    role: text(), // "Guardia", "Playmaker", "Ala", "Centro"
    roleId: integer(),
    uefaRatio: text(), // 'I' italiano / 'E' estero
  },
  (t) => [
    unique("player_stints_player_team_start_unique").on(
      t.playerId,
      t.teamSeasonId,
      t.startDate,
    ),
    index("player_stints_team_dates_idx").on(t.teamSeasonId, t.startDate, t.endDate),
  ],
);

// Alias per riconciliare fonti diverse: "Pallacanestro Reggiana",
// "UNA Hotels Reggio Emilia" e "Reggio Emilia" sono la stessa entità.
export const clubAliases = pgTable(
  "club_aliases",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    source: text().notNull(),
    aliasText: text().notNull(),
  },
  (t) => [unique("club_aliases_source_alias_unique").on(t.source, t.aliasText)],
);

export const playerAliases = pgTable(
  "player_aliases",
  {
    id: uuid().primaryKey().defaultRandom(),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    source: text().notNull(),
    aliasText: text().notNull(),
  },
  (t) => [unique("player_aliases_source_alias_unique").on(t.source, t.aliasText)],
);

// ============ COMPETIZIONI E PARTITE ============

// La fonte modella Regular Season e Playoff come competizioni distinte
// della stessa stagione (596 = RS 2025-26, 595 = PO 2025-26).
export const competitions = pgTable("competitions", {
  id: uuid().primaryKey().defaultRandom(),
  lbaChampionshipId: integer().unique(),
  seasonYear: integer().notNull(),
  seriesCode: text().notNull(), // 'A1'
  typeCode: text().notNull(), // 'RS' | 'PO' | 'CI' | 'SC' | 'NGC'
  name: text().notNull(),
  logoKey: text(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid().primaryKey().defaultRandom(),
    lbaMatchId: integer().unique(),
    competitionId: uuid()
      .notNull()
      .references(() => competitions.id),

    phaseId: integer(), // 1 = Andata, 2 = Ritorno
    daySerial: integer(), // numero giornata
    dayName: text(), // "1° Giornata"

    startsAt: timestamp({ withTimezone: true }).notNull(),
    homeTeamSeasonId: uuid()
      .notNull()
      .references(() => teamSeasons.id),
    awayTeamSeasonId: uuid()
      .notNull()
      .references(() => teamSeasons.id),

    status: text().notNull().default("scheduled"),
    homeScore: integer(),
    awayScore: integer(),
    quarterScores: jsonb(), // dal tabellino, quando disponibile
    additionalTime: integer().notNull().default(0), // numero di supplementari

    venueName: text(),
    townName: text(),
    referees: text().array(),
    ticketingUrl: text(),
    hasStreaming: boolean().notNull().default(false),
    liveUrl: text(),
    websocketMatchId: text(), // per un eventuale live futuro

    votingState: text().notNull().default("closed"),
    votingOpensAt: timestamp({ withTimezone: true }),
    votingClosesAt: timestamp({ withTimezone: true }),
    // quando è partita la push "ultime ore per votare" (null = mai)
    voteClosingNotifiedAt: timestamp({ withTimezone: true }),

    lastSyncedAt: timestamp({ withTimezone: true }),
    manualOverride: boolean().notNull().default(false),
  },
  (t) => [
    check(
      "matches_status_check",
      sql`${t.status} in ('scheduled','live','finished','postponed','cancelled')`,
    ),
    check(
      "matches_voting_state_check",
      sql`${t.votingState} in ('closed','open','tallied')`,
    ),
    index("matches_starts_at_idx").on(t.startsAt.desc()),
    index("matches_voting_open_idx").on(t.votingState).where(sql`voting_state = 'open'`),
  ],
);

// Nomi canonici. La mappatura dal vocabolario LBA sta nell'adapter.
export const playerMatchStats = pgTable(
  "player_match_stats",
  {
    id: uuid().primaryKey().defaultRandom(),
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id),
    starter: boolean(),
    minutes: numeric({ precision: 4, scale: 1 }),
    points: integer(),
    fg2m: integer(),
    fg2a: integer(),
    fg3m: integer(),
    fg3a: integer(),
    ftm: integer(),
    fta: integer(),
    dunks: integer(),
    rebOff: integer(),
    rebDef: integer(),
    assists: integer(),
    steals: integer(),
    turnovers: integer(),
    blocks: integer(),
    blocksReceived: integer(),
    foulsCommitted: integer(),
    foulsReceived: integer(),
    plusMinus: integer(),
    rating: numeric({ precision: 5, scale: 1 }), // valutazione (rating_lega)
    oer: numeric({ precision: 6, scale: 4 }),
    manualOverride: boolean().notNull().default(false),
  },
  (t) => [unique("player_match_stats_match_player_unique").on(t.matchId, t.playerId)],
);

// ============ UTENTI ============

// La FK profiles.id → auth.users(id) vive nella migrazione 0000, scritta a
// mano: auth è uno schema esterno gestito da Supabase e Drizzle non deve
// sapere che esiste, altrimenti ogni generate prova a crearne le tabelle.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey(),
    nickname: text().notNull().unique(),
    role: text().notNull().default("user"),
    subscriptionCode: text(), // autodichiarato, non verificato
    subscriptionYears: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("profiles_role_check", sql`${t.role} in ('user','admin')`)],
);

// ============ VOTI ============

export const votes = pgTable(
  "votes",
  {
    id: uuid().primaryKey().defaultRandom(),
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    bestPlayerId: uuid()
      .notNull()
      .references(() => players.id),
    optionalAId: uuid().references(() => players.id),
    optionalBId: uuid().references(() => players.id),
    favoritePlayerId: uuid().references(() => players.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Un voto per utente per partita, non modificabile
    unique("votes_match_user_unique").on(t.matchId, t.userId),
    // Best, A e B devono essere tre giocatori distinti (il Preferito può coincidere)
    check(
      "votes_optional_a_distinct_check",
      sql`${t.optionalAId} is null or ${t.optionalAId} <> ${t.bestPlayerId}`,
    ),
    check(
      "votes_optional_b_distinct_check",
      sql`${t.optionalBId} is null or ${t.optionalBId} <> ${t.bestPlayerId}`,
    ),
    check(
      "votes_optionals_distinct_check",
      sql`${t.optionalAId} is null or ${t.optionalBId} is null or ${t.optionalAId} <> ${t.optionalBId}`,
    ),
  ],
);

// Aggregato calcolato alla chiusura. L'unica cosa che il pubblico legge.
export const voteTallies = pgTable(
  "vote_tallies",
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id),
    bestCount: integer().notNull().default(0),
    supportCount: integer().notNull().default(0),
    performancePoints: integer().notNull().default(0), // best*3 + support*1
    favoriteCount: integer().notNull().default(0),
    computedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

// ============ PRONOSTICI ============

export const predictions = pgTable(
  "predictions",
  {
    id: uuid().primaryKey().defaultRandom(),
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    question: text().notNull(),
    kind: text().notNull(),
    options: jsonb(),
    autoResolvable: boolean().notNull().default(false),
    resolutionSpec: jsonb(), // quale statistica leggere e come confrontarla
    closesAt: timestamp({ withTimezone: true }).notNull(),
    correctAnswer: jsonb(),
    status: text().notNull().default("open"),
  },
  (t) => [
    check(
      "predictions_kind_check",
      sql`${t.kind} in ('match_result','margin','over_under','numeric_stat','open')`,
    ),
    check(
      "predictions_status_check",
      sql`${t.status} in ('open','closed','resolved','voided')`,
    ),
  ],
);

export const predictionAnswers = pgTable(
  "prediction_answers",
  {
    id: uuid().primaryKey().defaultRandom(),
    predictionId: uuid()
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    answer: jsonb().notNull(),
    isCorrect: boolean(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("prediction_answers_prediction_user_unique").on(t.predictionId, t.userId),
  ],
);

// I punti stanno nel ledger così la formula può cambiare e si ricalcolano.
export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reason: text().notNull(),
    refId: uuid(),
    points: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "points_ledger_reason_check",
      sql`${t.reason} in ('prediction_correct','prediction_bonus','vote_cast','manual')`,
    ),
  ],
);

// ============ CONTENUTI E SISTEMA ============

export const news = pgTable(
  "news",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(), // 'lba' | 'pr_wordpress'
    sourceId: text(),
    title: text().notNull(),
    url: text().notNull(),
    excerpt: text(),
    category: text(),
    imageUrl: text(),
    publishedAt: timestamp({ withTimezone: true }).notNull(),
    isPinned: boolean().notNull().default(false),
  },
  (t) => [unique("news_source_source_id_unique").on(t.source, t.sourceId)],
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(),
    target: text().notNull(), // 'roster'|'calendar'|'boxscore'|'news'|'stats'
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
    status: text().notNull().default("running"),
    recordsSeen: integer(),
    recordsChanged: integer(),
    diff: jsonb(),
    error: text(),
  },
  (t) => [
    check(
      "ingestion_runs_status_check",
      sql`${t.status} in ('running','ok','partial','failed')`,
    ),
  ],
);

export const reconciliationQueue = pgTable(
  "reconciliation_queue",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(),
    entityType: text().notNull(),
    rawValue: text().notNull(),
    context: jsonb(),
    resolvedTo: uuid(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "reconciliation_queue_entity_type_check",
      sql`${t.entityType} in ('player','club')`,
    ),
  ],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text().notNull().unique(),
  keys: jsonb().notNull(),
  categories: text()
    .array()
    .notNull()
    .default(["vote_open", "vote_closing", "tally_published"]),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
