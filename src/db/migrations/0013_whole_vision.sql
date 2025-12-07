CREATE TABLE "user_question" (
	"id_user_question" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"id_question" uuid NOT NULL,
	"answer" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_question" ADD CONSTRAINT "user_question_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question" ADD CONSTRAINT "user_question_id_question_question_psychotest_id_question_fk" FOREIGN KEY ("id_question") REFERENCES "public"."question_psychotest"("id_question") ON DELETE cascade ON UPDATE no action;