ALTER TABLE "user_question" ADD COLUMN "option_a" varchar(128);--> statement-breakpoint
ALTER TABLE "user_question" ADD COLUMN "option_b" varchar(128);--> statement-breakpoint
ALTER TABLE "user_question" ADD COLUMN "option_c" varchar(128);--> statement-breakpoint
ALTER TABLE "user_question" ADD COLUMN "option_d" varchar(128);--> statement-breakpoint
ALTER TABLE "user_question" DROP COLUMN "options";