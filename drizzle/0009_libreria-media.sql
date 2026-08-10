CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"mime" text,
	"bytes" integer,
	"source" text NOT NULL,
	"caption" text,
	"taken_at" timestamp with time zone,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storageKey_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_assets_status_check" CHECK ("media_assets"."status" in ('pending','ready')),
	CONSTRAINT "media_assets_source_check" CHECK ("media_assets"."source" in ('admin','mcp')),
	CONSTRAINT "media_assets_ready_check" CHECK ("media_assets"."status" = 'pending' or ("media_assets"."width" is not null and "media_assets"."height" is not null and "media_assets"."mime" is not null and "media_assets"."bytes" is not null))
);
--> statement-breakpoint
ALTER TABLE "social_media_items" ALTER COLUMN "template" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_items" ALTER COLUMN "params" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_items" ADD COLUMN "kind" text DEFAULT 'template' NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_items" ADD COLUMN "asset_id" uuid;--> statement-breakpoint
ALTER TABLE "social_media_items" ADD CONSTRAINT "social_media_items_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_media_items" ADD CONSTRAINT "social_media_items_kind_check" CHECK ("social_media_items"."kind" in ('template','asset'));--> statement-breakpoint
ALTER TABLE "social_media_items" ADD CONSTRAINT "social_media_items_forma_check" CHECK (("social_media_items"."kind" = 'template' and "social_media_items"."template" is not null and "social_media_items"."params" is not null and "social_media_items"."asset_id" is null) or ("social_media_items"."kind" = 'asset' and "social_media_items"."asset_id" is not null and (("social_media_items"."template" is null and "social_media_items"."params" is null) or ("social_media_items"."template" is not null and "social_media_items"."params" is not null))));--> statement-breakpoint
-- Come da convenzione (migrazione 0006): tabella nuova = chiusa a PostgREST.
alter table "media_assets" enable row level security;
