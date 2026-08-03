ALTER TABLE "vote_tallies" ADD COLUMN "second_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vote_tallies" ADD COLUMN "third_count" integer DEFAULT 0 NOT NULL;