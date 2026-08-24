ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "nickname" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_id_auth_users_fk";