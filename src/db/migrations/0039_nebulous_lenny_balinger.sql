ALTER TABLE "roadmap_items" RENAME COLUMN "minggu_ke" TO "phase";--> statement-breakpoint
ALTER TABLE "roadmap_items" RENAME COLUMN "deskripsi" TO "materi";--> statement-breakpoint
ALTER TABLE "roadmap_items" DROP COLUMN "skill_target";