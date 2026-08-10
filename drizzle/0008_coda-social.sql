CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"external_account_id" text NOT NULL,
	"access_token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_accounts_platform_unique" UNIQUE("platform")
);
--> statement-breakpoint
CREATE TABLE "social_media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"template" text NOT NULL,
	"params" jsonb NOT NULL,
	"rendered_url" text,
	"rendered_at" timestamp with time zone,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	CONSTRAINT "social_media_items_post_position_unique" UNIQUE("post_id","position")
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"platform" text NOT NULL,
	"kind" text DEFAULT 'single' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"source" text NOT NULL,
	"notes" text,
	"external_id" text,
	"permalink" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_posts_idempotencyKey_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "social_posts_status_check" CHECK ("social_posts"."status" in ('draft','approved','publishing','published','failed','archived')),
	CONSTRAINT "social_posts_platform_check" CHECK ("social_posts"."platform" in ('instagram_feed','instagram_story')),
	CONSTRAINT "social_posts_kind_check" CHECK ("social_posts"."kind" in ('single','carousel')),
	CONSTRAINT "social_posts_source_check" CHECK ("social_posts"."source" in ('mcp','admin'))
);
--> statement-breakpoint
ALTER TABLE "social_media_items" ADD CONSTRAINT "social_media_items_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_posts_publish_queue_idx" ON "social_posts" USING btree ("scheduled_at") WHERE status = 'approved';--> statement-breakpoint
-- Come da convenzione (migrazione 0006): tabella nuova = chiusa a PostgREST.
-- RLS attiva senza policy; l'app ci arriva solo via Drizzle (ruolo postgres,
-- BYPASSRLS) dentro server action e route handler.
alter table "social_posts" enable row level security;--> statement-breakpoint
alter table "social_media_items" enable row level security;--> statement-breakpoint
alter table "social_accounts" enable row level security;