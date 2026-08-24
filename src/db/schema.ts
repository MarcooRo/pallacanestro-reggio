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

import type { Blocco } from "@/src/lib/news/blocchi";

// ============ ANAGRAFICHE ============

// Entità stabile nel tempo. Chiave canonica del progetto (Reggio = club_id LBA 44).
export const clubs = pgTable(
  "clubs",
  {
    id: uuid().primaryKey().defaultRandom(),
    lbaClubId: integer().unique(),
    // organisationId FIBA, stabile tra stagioni (Reggio = 2102): àncora
    // delle avversarie di coppa che in LBA non esistono
    fibaOrganisationId: integer().unique(),
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
    // null per le squadre solo di coppa (avversarie BCL): niente scheda
    // /squadre, niente roster LBA
    lbaTeamId: integer(), // 1760 per Reggio 2026
    fibaTeamId: integer().unique(), // team BCL della stagione (Reggio 2026 = 284938)
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
  fibaCompetitionId: integer().unique(), // BCL (2026-27 = 209123)
  seasonYear: integer().notNull(),
  seriesCode: text().notNull(), // 'A1' | 'BCL'
  typeCode: text().notNull(), // 'RS' | 'PO' | 'CI' | 'SC' | 'NGC' | 'BCL'
  name: text().notNull(),
  logoKey: text(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid().primaryKey().defaultRandom(),
    lbaMatchId: integer().unique(),
    fibaGameId: integer().unique(), // gara BCL: gemello di lba_match_id
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

// Dal 24/08/2026 il profilo è un'identità anonima autonoma (niente più
// auth.users di Supabase): nasce alla prima partecipazione e vive nel
// cookie firmato del dispositivo (src/lib/identita). La vecchia FK verso
// auth.users è caduta con la migrazione 0012.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Null finché il tifoso non lo sceglie: l'identità anonima nasce senza
    // nome e compare nelle classifiche solo quando un nome ce l'ha.
    nickname: text().unique(),
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
    // Podio ordinato: A è il secondo (2 punti), B il terzo (1 punto).
    // Nomi storici, tenuti per non spostare i dati già scritti.
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
    secondCount: integer().notNull().default(0),
    thirdCount: integer().notNull().default(0),
    // Secondi + terzi: la vista delle classifiche si appoggia a questa somma
    supportCount: integer().notNull().default(0),
    performancePoints: integer().notNull().default(0), // best*3 + second*2 + third*1
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

// ============ PARTECIPAZIONE ============

// Tre gesti leggeri attorno alla partita. Il pubblico legge SOLO aggregati
// (conteggi e curva): le righe individuali non lasciano mai le server action,
// come già vale per votes → vote_tallies.

// "Io ci sono": dichiarazione di intenti, non presenza verificata.
export const attendances = pgTable(
  "attendances",
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  // La chiave composta è già il vincolo "uno per utente per partita".
  (t) => [primaryKey({ columns: [t.matchId, t.userId] })],
);

// Reazione al risultato: una per utente per partita, modificabile — a
// differenza del voto, che è immutabile per costruzione.
export const matchReactions = pgTable(
  "match_reactions",
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Codice da REAZIONI (src/lib/reazioni/tipi.ts). Volutamente senza check
    // constraint: cambiare il set di reazioni non deve essere una migrazione.
    kind: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.userId] })],
);

// Il boato: intensità dei tap della tifoseria in bucket da 10 secondi.
// Nessun riferimento all'utente — la riga nasce già aggregata, quindi
// nemmeno volendo si potrebbe risalire a chi ha tappato.
export const roarBuckets = pgTable(
  "roar_buckets",
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    // Inizio del bucket, allineato dal server: il client non decide il tempo.
    bucketStart: timestamp({ withTimezone: true }).notNull(),
    taps: integer().notNull().default(0),
    // Invii che hanno contribuito al bucket (non utenti distinti): serve solo
    // a dare la scala dell'onda, non a contare persone.
    bursts: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.bucketStart] })],
);

// ============ CONTENUTI E SISTEMA ============

// Due forme nella stessa tabella, tenute onesta dal check `news_forma`:
//   - news di fonte ('lba', 'pr_wordpress'): un rimando, url obbligatorio,
//     il testo si legge al volo dalla fonte e non si salva (articolo.ts);
//   - articolo nostro ('redazione'): corpo a blocchi su DB, nessun url,
//     slug per l'indirizzo leggibile.
// Come per il social, l'AI via MCP scrive solo 'draft': la transizione a
// 'published' vive nelle server action admin.
export const news = pgTable(
  "news",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(), // 'lba' | 'pr_wordpress' | 'redazione'
    sourceId: text(),
    // Le news di fonte nascono già pubblicate (l'ingestion non le rilegge):
    // il default tiene in piedi le righe esistenti e il cron invariato.
    status: text().notNull().default("published"),
    title: text().notNull(),
    slug: text().unique(),
    url: text(),
    excerpt: text(),
    category: text(),
    imageUrl: text(),
    // La copertina viene dalla libreria foto nostra: restrict perché una
    // foto pubblicata in un articolo non si cancella per sbaglio.
    assetId: uuid().references(() => mediaAssets.id, { onDelete: "restrict" }),
    body: jsonb().$type<Blocco[]>(),
    authorName: text(),
    publishedAt: timestamp({ withTimezone: true }).notNull(),
    isPinned: boolean().notNull().default(false),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("news_source_source_id_unique").on(t.source, t.sourceId),
    check("news_status_check", sql`${t.status} in ('draft','published','archived')`),
    check("news_source_check", sql`${t.source} in ('lba','pr_wordpress','redazione')`),
    check(
      "news_forma_check",
      sql`(${t.source} = 'redazione' and ${t.url} is null and ${t.body} is not null and ${t.slug} is not null) or (${t.source} <> 'redazione' and ${t.url} is not null and ${t.body} is null)`,
    ),
    // La lista pubblica legge sempre e solo i pubblicati, dal più recente
    index("news_pubblicate_idx")
      .on(t.isPinned, t.publishedAt)
      .where(sql`status = 'published'`),
  ],
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

// ============ SOCIAL ============

// Post social in coda. Principio non negoziabile: l'AI (via MCP) scrive solo
// 'draft' e 'archived'; la transizione a 'approved' avviene SOLO nelle server
// action admin, mai nel layer MCP. Imposto nel codice, non solo qui.
export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: text().notNull().default("draft"),
    // Predisposto per TikTok: basterà allargare il check, niente enum Postgres
    platform: text().notNull(),
    kind: text().notNull().default("single"),
    caption: text().notNull().default(""),
    hashtags: text().array().notNull().default([]),
    scheduledAt: timestamp({ withTimezone: true }), // null = appena approvato
    publishedAt: timestamp({ withTimezone: true }),
    source: text().notNull(), // chi l'ha creato
    notes: text(), // note dell'AI per l'admin, mai pubblicate
    externalId: text(), // id del media su Instagram (fase 2)
    permalink: text(), // (fase 2)
    error: text(),
    attempts: integer().notNull().default(0),
    idempotencyKey: text().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "social_posts_status_check",
      sql`${t.status} in ('draft','approved','publishing','published','failed','archived')`,
    ),
    check(
      "social_posts_platform_check",
      sql`${t.platform} in ('instagram_feed','instagram_story')`,
    ),
    check("social_posts_kind_check", sql`${t.kind} in ('single','carousel')`),
    check("social_posts_source_check", sql`${t.source} in ('mcp','admin')`),
    // La coda del cron di pubblicazione (fase 2): approved per scheduled_at
    index("social_posts_publish_queue_idx")
      .on(t.scheduledAt)
      .where(sql`status = 'approved'`),
  ],
);

// La libreria foto (fase 1.6). Nasce come archivio di materiale nostro; da
// agosto 2026 accetta anche immagini scaricate da un URL esterno, e in quel
// caso `origin_url` dice da dove arrivano: è l'unica traccia della
// provenienza, quindi l'unico modo per sapere, prima di pubblicare, se una
// foto è nostra o di qualcun altro. `source` resta CHI l'ha messa dentro
// (admin o mcp), non da dove viene.
// Un asset via MCP nasce 'pending' (riga senza file) e diventa 'ready' solo
// quando il file è sul bucket e i metadati sono stati letti server-side,
// mai fidandosi del client.
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: text().notNull().default("ready"),
    storageKey: text().notNull().unique(), // chiave nel bucket "media": serve a cancellare
    url: text().notNull(), // URL pubblico su Supabase Storage
    width: integer(),
    height: integer(),
    mime: text(),
    bytes: integer(),
    source: text().notNull(),
    originUrl: text(), // null = foto nostra; valorizzato = scaricata da lì
    caption: text(), // ciò su cui l'AI si basa per scegliere: va scritta bene
    takenAt: timestamp({ withTimezone: true }), // da EXIF, altrimenti data di upload
    tags: text().array().notNull().default([]),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("media_assets_status_check", sql`${t.status} in ('pending','ready')`),
    check("media_assets_source_check", sql`${t.source} in ('admin','mcp')`),
    // ready = metadati completi; pending può averli tutti null
    check(
      "media_assets_ready_check",
      sql`${t.status} = 'pending' or (${t.width} is not null and ${t.height} is not null and ${t.mime} is not null and ${t.bytes} is not null)`,
    ),
  ],
);

// Le singole immagini di un post, nell'ordine di pubblicazione. Tre forme:
// template (grafica da parametri), asset (foto della libreria così com'è),
// asset + template (composizione: la foto entra come parametro del template).
// Per i template, params + template bastano a rigenerare l'immagine da zero:
// il JPEG su storage è un derivato, mai la fonte di verità.
export const socialMediaItems = pgTable(
  "social_media_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: uuid()
      .notNull()
      .references(() => socialPosts.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    kind: text().notNull().default("template"),
    // restrict: una foto usata in un post non si cancella dalla libreria
    assetId: uuid().references(() => mediaAssets.id, { onDelete: "restrict" }),
    template: text(), // nome dal registry OG (src/lib/og/registry.ts)
    params: jsonb(), // validati con lo Zod del template
    renderedUrl: text(), // URL pubblico del JPEG finale
    renderedAt: timestamp({ withTimezone: true }),
    width: integer().notNull(),
    height: integer().notNull(),
  },
  (t) => [
    unique("social_media_items_post_position_unique").on(t.postId, t.position),
    check("social_media_items_kind_check", sql`${t.kind} in ('template','asset')`),
    // Le tre forme lecite, imposte anche qui e non solo nel service
    check(
      "social_media_items_forma_check",
      sql`(${t.kind} = 'template' and ${t.template} is not null and ${t.params} is not null and ${t.assetId} is null) or (${t.kind} = 'asset' and ${t.assetId} is not null and ((${t.template} is null and ${t.params} is null) or (${t.template} is not null and ${t.params} is not null)))`,
    ),
  ],
);

// Vuota in fase 1, popolata in fase 2 con l'account Instagram.
// access_token cifrato a riposo (AES-256-GCM, chiave in env), mai in chiaro.
export const socialAccounts = pgTable("social_accounts", {
  id: uuid().primaryKey().defaultRandom(),
  platform: text().notNull().unique(),
  externalAccountId: text().notNull(),
  accessToken: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }),
  refreshedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
