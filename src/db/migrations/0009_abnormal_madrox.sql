CREATE TYPE "public"."type_question" AS ENUM('Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism', 'Numeric', 'Spatial', 'Perceptual', 'Abstract', 'Verbal');--> statement-breakpoint
CREATE TABLE "question_psychotest" (
	"id_question" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"type_question" "type_question" NOT NULL,
	"question" varchar(256) NOT NULL,
	"answer" varchar(128),
	"explanation" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_psychotest" ADD CONSTRAINT "question_psychotest_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;