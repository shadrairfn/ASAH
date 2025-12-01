CREATE TYPE "public"."gender_type" AS ENUM('male', 'female', 'other');--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "tanggal_lahir" TO "birth_date";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "jenis_kelamin" TO "gender_type";