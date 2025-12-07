ALTER TABLE "psychotest_results" ALTER COLUMN "openness" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "psychotest_results" ALTER COLUMN "conscientiousness" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "psychotest_results" ALTER COLUMN "extraversion" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "psychotest_results" ALTER COLUMN "agreeableness" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "psychotest_results" ALTER COLUMN "neuroticism" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "psychotest_results" ADD COLUMN "numeric" real NOT NULL;--> statement-breakpoint
ALTER TABLE "psychotest_results" ADD COLUMN "spatial" real NOT NULL;--> statement-breakpoint
ALTER TABLE "psychotest_results" ADD COLUMN "perceptual" real NOT NULL;--> statement-breakpoint
ALTER TABLE "psychotest_results" ADD COLUMN "abstract" real NOT NULL;--> statement-breakpoint
ALTER TABLE "psychotest_results" ADD COLUMN "verbal" real NOT NULL;