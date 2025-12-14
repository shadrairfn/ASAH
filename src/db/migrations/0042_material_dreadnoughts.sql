ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_id_module_modules_id_module_fk";
--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "id_user" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "id_user" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "id_roadmapItems" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "question" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "opsi_a" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "opsi_b" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "opsi_c" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "opsi_d" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "correct_answer" varchar(1) NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_id_roadmapItems_roadmap_items_id_item_fk" FOREIGN KEY ("id_roadmapItems") REFERENCES "public"."roadmap_items"("id_item") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" DROP COLUMN "id_question";--> statement-breakpoint
ALTER TABLE "quizzes" DROP COLUMN "id_module";--> statement-breakpoint
ALTER TABLE "quizzes" DROP COLUMN "title";