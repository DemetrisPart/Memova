-- AlterTable
ALTER TABLE "events" ADD COLUMN "gallery_visible_days" INTEGER NOT NULL DEFAULT 14;

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "failure_reason" VARCHAR(500);
