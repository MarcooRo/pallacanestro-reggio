ALTER TABLE "team_seasons" ALTER COLUMN "lba_team_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "fiba_organisation_id" integer;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "fiba_competition_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "fiba_game_id" integer;--> statement-breakpoint
ALTER TABLE "team_seasons" ADD COLUMN "fiba_team_id" integer;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_fibaOrganisationId_unique" UNIQUE("fiba_organisation_id");--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_fibaCompetitionId_unique" UNIQUE("fiba_competition_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_fibaGameId_unique" UNIQUE("fiba_game_id");--> statement-breakpoint
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_fibaTeamId_unique" UNIQUE("fiba_team_id");