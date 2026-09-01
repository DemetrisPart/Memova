-- AlterTable
ALTER TABLE "events" ADD COLUMN "notify_expiry_3d" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN "notify_wedding_countdown" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN "notify_first_guest_photo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN "notify_storage_near_full" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN "notify_daily_digest" BOOLEAN NOT NULL DEFAULT false;
