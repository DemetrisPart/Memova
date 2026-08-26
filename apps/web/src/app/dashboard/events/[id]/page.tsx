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
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-charcoal-900 lg:text-lg">
          Overview
        </h2>
        <EventHealthIndicator storageUsedPercent={stats.storageUsedPercent} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-soft lg:rounded-2xl lg:px-4 lg:py-3">
          <p className="text-xs text-stone-400 lg:text-sm">Photos</p>
          <p className="mt-0.5 text-xl font-semibold text-charcoal-900 lg:text-2xl">
            {stats.photoCount}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-soft lg:rounded-2xl lg:px-4 lg:py-3">
          <p className="text-xs text-stone-400 lg:text-sm">Videos</p>
          <p className="mt-0.5 text-xl font-semibold text-charcoal-900 lg:text-2xl">
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
