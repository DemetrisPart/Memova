import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { EventHealthIndicator } from "@/components/dashboard/event-health-indicator";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StorageMeter } from "@/components/dashboard/storage-meter";
import {
  fetchCoupleGalleryServer,
  fetchEventStatsServer,
} from "@/lib/api/server-fetch";
import type { CoupleGalleryResponse, EventStats } from "@/lib/api/types";

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventOverviewPage({ params }: OverviewPageProps) {
  const { id } = await params;
  const [stats, gallery] = await Promise.all([
    fetchEventStatsServer(id) as Promise<EventStats>,
    fetchCoupleGalleryServer(id, 8) as Promise<CoupleGalleryResponse>,
  ]);

  const recentItems = gallery.items;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-charcoal-900">Overview</h2>
        <EventHealthIndicator storageUsedPercent={stats.storageUsedPercent} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="aspect-square rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-stone-400">Photos</p>
          <p className="mt-1 text-3xl font-semibold text-charcoal-900">
            {stats.photoCount}
          </p>
        </div>
        <div className="aspect-square rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-stone-400">Videos</p>
          <p className="mt-1 text-3xl font-semibold text-charcoal-900">
            {stats.videoCount}
          </p>
        </div>
      </div>

      <StorageMeter
        usedBytes={stats.storageUsedBytes}
        limitBytes={stats.storageLimitBytes}
        usedPercent={stats.storageUsedPercent}
      />

      <QuickActions eventId={id} />

      <ActivityTimeline items={recentItems} eventId={id} />
    </div>
  );
}
