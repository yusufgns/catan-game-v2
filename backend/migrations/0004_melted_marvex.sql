ALTER TABLE "user_stats" ADD COLUMN "ranked_games_played" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_stats" ADD COLUMN "ranked_games_won" integer DEFAULT 0 NOT NULL;