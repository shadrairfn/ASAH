ALTER TABLE "psychotest_results" ADD COLUMN "vectorize_score" vector(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "psychotest_results" DROP COLUMN "score";