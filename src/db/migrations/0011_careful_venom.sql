CREATE TYPE "public"."scoring_type" AS ENUM('normal', 'reverse');--> statement-breakpoint
ALTER TABLE "question_psychotest" ADD COLUMN "scoring_type" "scoring_type";