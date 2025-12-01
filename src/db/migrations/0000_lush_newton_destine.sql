CREATE TYPE "public"."institution_type" AS ENUM('blk', 'campus', 'disnaker');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('xendit', 'midtrans');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('paid', 'pending', 'failed');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."skill_relation_type" AS ENUM('prerequisite', 'related', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'institution_admin');--> statement-breakpoint
CREATE TABLE "career_recommendations" (
	"id_rekomendasi" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"id_psikotes" uuid NOT NULL,
	"id_career" uuid NOT NULL,
	"skor_kecocokan" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "careers" (
	"id_career" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_karir" varchar(128) NOT NULL,
	"deskripsi" text,
	"level_kesulitan" varchar(32),
	"industri" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_admins" (
	"id_admin" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"id_institution" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_licenses" (
	"id_license" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_institution" uuid NOT NULL,
	"tahun" integer NOT NULL,
	"harga" numeric(12, 2) NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id_institution" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_instansi" varchar(128) NOT NULL,
	"alamat" text,
	"jenis" "institution_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_progress" (
	"id_progress" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"id_module" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'not_started' NOT NULL,
	"waktu_mulai" timestamp with time zone,
	"waktu_selesai" timestamp with time zone,
	"nilai_quiz" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id_module" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_career" uuid NOT NULL,
	"id_roadmap_item" uuid NOT NULL,
	"format" varchar(32) NOT NULL,
	"title" varchar(128) NOT NULL,
	"content" text NOT NULL,
	"embedding_vector" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id_payment" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"metode" "payment_method" NOT NULL,
	"status" "payment_status" NOT NULL,
	"external_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "psychotest_results" (
	"id_psikotes" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"openness" integer NOT NULL,
	"conscientiousness" integer NOT NULL,
	"extraversion" integer NOT NULL,
	"agreeableness" integer NOT NULL,
	"neuroticism" integer NOT NULL,
	"rekomendasi_gaya_belajar" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id_attempt" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_quiz" uuid NOT NULL,
	"id_user" uuid NOT NULL,
	"skor" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id_question" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_quiz" uuid NOT NULL,
	"pertanyaan" text NOT NULL,
	"opsi_a" text NOT NULL,
	"opsi_b" text NOT NULL,
	"opsi_c" text NOT NULL,
	"opsi_d" text NOT NULL,
	"jawaban_benar" varchar(1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id_quiz" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_module" uuid NOT NULL,
	"title" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id_item" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_roadmap" uuid NOT NULL,
	"minggu_ke" integer NOT NULL,
	"judul" varchar(128) NOT NULL,
	"deskripsi" text,
	"skill_target" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id_roadmap" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"id_career" uuid NOT NULL,
	"generated_by_ai" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_relations" (
	"id_relation" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_skill_parent" uuid NOT NULL,
	"id_skill_child" uuid NOT NULL,
	"jenis_relasi" "skill_relation_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id_skill" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_skill" varchar(128) NOT NULL,
	"kategori" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id_subscription" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"harga" numeric(12, 2) NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"id_payment" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id_user" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" varchar(128) NOT NULL,
	"email" varchar(128) NOT NULL,
	"password_hash" varchar(255),
	"tanggal_lahir" date,
	"jenis_kelamin" varchar(16),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_id_psikotes_psychotest_results_id_psikotes_fk" FOREIGN KEY ("id_psikotes") REFERENCES "public"."psychotest_results"("id_psikotes") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_id_career_careers_id_career_fk" FOREIGN KEY ("id_career") REFERENCES "public"."careers"("id_career") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_admins" ADD CONSTRAINT "institution_admins_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_admins" ADD CONSTRAINT "institution_admins_id_institution_institutions_id_institution_fk" FOREIGN KEY ("id_institution") REFERENCES "public"."institutions"("id_institution") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_licenses" ADD CONSTRAINT "institution_licenses_id_institution_institutions_id_institution_fk" FOREIGN KEY ("id_institution") REFERENCES "public"."institutions"("id_institution") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_id_module_modules_id_module_fk" FOREIGN KEY ("id_module") REFERENCES "public"."modules"("id_module") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_id_career_careers_id_career_fk" FOREIGN KEY ("id_career") REFERENCES "public"."careers"("id_career") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_id_roadmap_item_roadmap_items_id_item_fk" FOREIGN KEY ("id_roadmap_item") REFERENCES "public"."roadmap_items"("id_item") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychotest_results" ADD CONSTRAINT "psychotest_results_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_id_quiz_quizzes_id_quiz_fk" FOREIGN KEY ("id_quiz") REFERENCES "public"."quizzes"("id_quiz") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_id_quiz_quizzes_id_quiz_fk" FOREIGN KEY ("id_quiz") REFERENCES "public"."quizzes"("id_quiz") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_id_module_modules_id_module_fk" FOREIGN KEY ("id_module") REFERENCES "public"."modules"("id_module") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_id_roadmap_roadmaps_id_roadmap_fk" FOREIGN KEY ("id_roadmap") REFERENCES "public"."roadmaps"("id_roadmap") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_id_career_careers_id_career_fk" FOREIGN KEY ("id_career") REFERENCES "public"."careers"("id_career") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relations" ADD CONSTRAINT "skill_relations_id_skill_parent_skills_id_skill_fk" FOREIGN KEY ("id_skill_parent") REFERENCES "public"."skills"("id_skill") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relations" ADD CONSTRAINT "skill_relations_id_skill_child_skills_id_skill_fk" FOREIGN KEY ("id_skill_child") REFERENCES "public"."skills"("id_skill") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_id_payment_payments_id_payment_fk" FOREIGN KEY ("id_payment") REFERENCES "public"."payments"("id_payment") ON DELETE set null ON UPDATE no action;