CREATE TABLE "option_careers" (
	"id_option_career" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_career" uuid NOT NULL,
	"options" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "option_careers" ADD CONSTRAINT "option_careers_id_career_careers_id_career_fk" FOREIGN KEY ("id_career") REFERENCES "public"."careers"("id_career") ON DELETE cascade ON UPDATE no action;