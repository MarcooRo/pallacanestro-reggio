CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"source" text NOT NULL,
	"alias_text" text NOT NULL,
	CONSTRAINT "club_aliases_source_alias_unique" UNIQUE("source","alias_text")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lba_club_id" integer,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"is_home_club" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_lbaClubId_unique" UNIQUE("lba_club_id")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lba_championship_id" integer,
	"season_year" integer NOT NULL,
	"series_code" text NOT NULL,
	"type_code" text NOT NULL,
	"name" text NOT NULL,
	"logo_key" text,
	CONSTRAINT "competitions_lbaChampionshipId_unique" UNIQUE("lba_championship_id")
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"target" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"records_seen" integer,
	"records_changed" integer,
	"diff" jsonb,
	"error" text,
	CONSTRAINT "ingestion_runs_status_check" CHECK ("ingestion_runs"."status" in ('running','ok','partial','failed'))
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lba_match_id" integer,
	"competition_id" uuid NOT NULL,
	"phase_id" integer,
	"day_serial" integer,
	"day_name" text,
	"starts_at" timestamp with time zone NOT NULL,
	"home_team_season_id" uuid NOT NULL,
	"away_team_season_id" uuid NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"quarter_scores" jsonb,
	"additional_time" integer DEFAULT 0 NOT NULL,
	"venue_name" text,
	"town_name" text,
	"referees" text[],
	"ticketing_url" text,
	"has_streaming" boolean DEFAULT false NOT NULL,
	"live_url" text,
	"websocket_match_id" text,
	"voting_state" text DEFAULT 'closed' NOT NULL,
	"voting_opens_at" timestamp with time zone,
	"voting_closes_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"manual_override" boolean DEFAULT false NOT NULL,
	CONSTRAINT "matches_lbaMatchId_unique" UNIQUE("lba_match_id"),
	CONSTRAINT "matches_status_check" CHECK ("matches"."status" in ('scheduled','live','finished','postponed','cancelled')),
	CONSTRAINT "matches_voting_state_check" CHECK ("matches"."voting_state" in ('closed','open','tallied'))
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"excerpt" text,
	"category" text,
	"image_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	CONSTRAINT "news_source_source_id_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
CREATE TABLE "player_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"source" text NOT NULL,
	"alias_text" text NOT NULL,
	CONSTRAINT "player_aliases_source_alias_unique" UNIQUE("source","alias_text")
);
--> statement-breakpoint
CREATE TABLE "player_match_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"starter" boolean,
	"minutes" numeric(4, 1),
	"points" integer,
	"fg2m" integer,
	"fg2a" integer,
	"fg3m" integer,
	"fg3a" integer,
	"ftm" integer,
	"fta" integer,
	"dunks" integer,
	"reb_off" integer,
	"reb_def" integer,
	"assists" integer,
	"steals" integer,
	"turnovers" integer,
	"blocks" integer,
	"blocks_received" integer,
	"fouls_committed" integer,
	"fouls_received" integer,
	"plus_minus" integer,
	"rating" numeric(5, 1),
	"oer" numeric(6, 4),
	"manual_override" boolean DEFAULT false NOT NULL,
	CONSTRAINT "player_match_stats_match_player_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_stints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"team_season_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"jersey_number" text,
	"role" text,
	"role_id" integer,
	"uefa_ratio" text,
	CONSTRAINT "player_stints_player_team_start_unique" UNIQUE("player_id","team_season_id","start_date")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lba_player_id" integer,
	"lba_code" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_date" date,
	"birth_place" text,
	"nationality" text,
	"height_cm" integer,
	"weight_kg" integer,
	"photo_key" text,
	"manual_override" boolean DEFAULT false NOT NULL,
	CONSTRAINT "players_lbaPlayerId_unique" UNIQUE("lba_player_id")
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"ref_id" uuid,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "points_ledger_reason_check" CHECK ("points_ledger"."reason" in ('prediction_correct','prediction_bonus','vote_cast','manual'))
);
--> statement-breakpoint
CREATE TABLE "prediction_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"answer" jsonb NOT NULL,
	"is_correct" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prediction_answers_prediction_user_unique" UNIQUE("prediction_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"question" text NOT NULL,
	"kind" text NOT NULL,
	"options" jsonb,
	"auto_resolvable" boolean DEFAULT false NOT NULL,
	"resolution_spec" jsonb,
	"closes_at" timestamp with time zone NOT NULL,
	"correct_answer" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	CONSTRAINT "predictions_kind_check" CHECK ("predictions"."kind" in ('match_result','margin','over_under','numeric_stat','open')),
	CONSTRAINT "predictions_status_check" CHECK ("predictions"."status" in ('open','closed','resolved','voided'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"subscription_code" text,
	"subscription_years" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_nickname_unique" UNIQUE("nickname"),
	CONSTRAINT "profiles_role_check" CHECK ("profiles"."role" in ('user','admin'))
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"categories" text[] DEFAULT '{"vote_open","vote_closing","tally_published"}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reconciliation_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"entity_type" text NOT NULL,
	"raw_value" text NOT NULL,
	"context" jsonb,
	"resolved_to" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reconciliation_queue_entity_type_check" CHECK ("reconciliation_queue"."entity_type" in ('player','club'))
);
--> statement-breakpoint
CREATE TABLE "team_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"season_year" integer NOT NULL,
	"lba_team_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"lba_club_code" text,
	"logo_key" text,
	CONSTRAINT "team_seasons_club_season_unique" UNIQUE("club_id","season_year"),
	CONSTRAINT "team_seasons_lba_team_id_unique" UNIQUE("lba_team_id")
);
--> statement-breakpoint
CREATE TABLE "vote_tallies" (
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"best_count" integer DEFAULT 0 NOT NULL,
	"support_count" integer DEFAULT 0 NOT NULL,
	"performance_points" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vote_tallies_match_id_player_id_pk" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"best_player_id" uuid NOT NULL,
	"optional_a_id" uuid,
	"optional_b_id" uuid,
	"favorite_player_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_match_user_unique" UNIQUE("match_id","user_id"),
	CONSTRAINT "votes_optional_a_distinct_check" CHECK ("votes"."optional_a_id" is null or "votes"."optional_a_id" <> "votes"."best_player_id"),
	CONSTRAINT "votes_optional_b_distinct_check" CHECK ("votes"."optional_b_id" is null or "votes"."optional_b_id" <> "votes"."best_player_id"),
	CONSTRAINT "votes_optionals_distinct_check" CHECK ("votes"."optional_a_id" is null or "votes"."optional_b_id" is null or "votes"."optional_a_id" <> "votes"."optional_b_id")
);
--> statement-breakpoint
ALTER TABLE "club_aliases" ADD CONSTRAINT "club_aliases_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_season_id_team_seasons_id_fk" FOREIGN KEY ("home_team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_season_id_team_seasons_id_fk" FOREIGN KEY ("away_team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_aliases" ADD CONSTRAINT "player_aliases_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stints" ADD CONSTRAINT "player_stints_team_season_id_team_seasons_id_fk" FOREIGN KEY ("team_season_id") REFERENCES "public"."team_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_answers" ADD CONSTRAINT "prediction_answers_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_answers" ADD CONSTRAINT "prediction_answers_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_tallies" ADD CONSTRAINT "vote_tallies_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_tallies" ADD CONSTRAINT "vote_tallies_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_best_player_id_players_id_fk" FOREIGN KEY ("best_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_optional_a_id_players_id_fk" FOREIGN KEY ("optional_a_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_optional_b_id_players_id_fk" FOREIGN KEY ("optional_b_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_favorite_player_id_players_id_fk" FOREIGN KEY ("favorite_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_home_club_unique" ON "clubs" USING btree ("is_home_club") WHERE is_home_club;--> statement-breakpoint
CREATE INDEX "matches_starts_at_idx" ON "matches" USING btree ("starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "matches_voting_open_idx" ON "matches" USING btree ("voting_state") WHERE voting_state = 'open';--> statement-breakpoint
CREATE INDEX "player_stints_team_dates_idx" ON "player_stints" USING btree ("team_season_id","start_date","end_date");--> statement-breakpoint
-- FK verso lo schema auth di Supabase, scritta a mano: auth.users esiste già
-- e Drizzle non la gestisce (vedi commento su profiles in src/db/schema.ts).
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade;
