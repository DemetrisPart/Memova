-- Drop daily digest preference (removed from couple settings)
ALTER TABLE "events" DROP COLUMN "notify_daily_digest";

-- Mandatory 50-photo couple email tracking
ALTER TABLE "events" ADD COLUMN "photo_milestone_50_notified_at" TIMESTAMP(3);
