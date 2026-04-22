DROP INDEX IF EXISTS "idx_users_name_tag";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tag_unique" UNIQUE("tag");