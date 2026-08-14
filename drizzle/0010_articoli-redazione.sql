ALTER TABLE "news" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "asset_id" uuid;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "body" jsonb;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "author_name" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_pubblicate_idx" ON "news" USING btree ("is_pinned","published_at") WHERE status = 'published';--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_status_check" CHECK ("news"."status" in ('draft','published','archived'));--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_source_check" CHECK ("news"."source" in ('lba','pr_wordpress','redazione'));--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_forma_check" CHECK (("news"."source" = 'redazione' and "news"."url" is null and "news"."body" is not null and "news"."slug" is not null) or ("news"."source" <> 'redazione' and "news"."url" is not null and "news"."body" is null));