-- One-shot tracking for couple notification emails
ALTER TABLE "events" ADD COLUMN "wedding_countdown_notified_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "expiry_3d_notified_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "first_guest_photo_notified_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "storage_near_full_notified_at" TIMESTAMP(3);
