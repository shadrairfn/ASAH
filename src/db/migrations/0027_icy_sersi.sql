ALTER TABLE "career_recommendations" RENAME COLUMN "skor_kecocokan" TO "similarity_score";--> statement-breakpoint
ALTER TABLE "careers" RENAME COLUMN "deskripsi" TO "description";--> statement-breakpoint
ALTER TABLE "careers" DROP CONSTRAINT "careers_id_user_users_id_user_fk";
--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD COLUMN "career_name" varchar(128);--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "careers" ADD COLUMN "name" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "careers" DROP COLUMN "id_user";--> statement-breakpoint
ALTER TABLE "careers" DROP COLUMN "career_option";--> statement-breakpoint
ALTER TABLE "careers" DROP COLUMN "nama_karir";