import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EventHealthIndicator } from "@/components/dashboard/event-health-indicator";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StorageMeter } from "@/components/dashboard/storage-meter";
import {
  fetchCoupleGalleryServer,
  fetchEventServer,
  fetchEventStatsServer,
  requireAuth,
} from "@/lib/api/server-fetch";
import type { CoupleGalleryResponse, EventStats } from "@/lib/api/types";
import { formatCoupleNames } from "@/lib/utils";

type OverviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventOverviewPage({ params }: OverviewPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const [event, stats, gallery] = await Promise.all([
    fetchEventServer(id),
    fetchEventStatsServer(id) as Promise<EventStats>,
    fetchCoupleGalleryServer(id, 8) as Promise<CoupleGalleryResponse>,
  ]);

  return (
    <>
      <DashboardHeader user={user} onLime />

      <div className="px-3 pt-3 lg:px-8 lg:pt-4">
        <section className="money-lime-zone mx-auto max-w-3xl overflow-hidden px-3.5 py-3.5 lg:px-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-[#181818] lg:text-base">
              {formatCoupleNames(event.groomName, event.brideName, event.title)}
            </h1>
            <EventHealthIndicator
              storageUsedPercent={stats.storageUsedPercent}
              onLime
            />
          </div>

          <div className="mt-3 space-y-3 lg:mt-3.5 lg:space-y-3.5">
            <h2 className="text-sm font-semibold text-[#181818] lg:text-base">
              Overview
            </h2>

            <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
              <div className="panel-3d px-3 py-2.5 lg:px-3.5 lg:py-3">
                <p className="text-sm font-semibold text-charcoal-900">Photos</p>
                <p className="mt-0.5 text-lg font-semibold text-white lg:text-xl">
                  {stats.photoCount}
                </p>
              </div>
              <div className="panel-3d px-3 py-2.5 lg:px-3.5 lg:py-3">
                <p className="text-sm font-semibold text-charcoal-900">Videos</p>
                <p className="mt-0.5 text-lg font-semibold text-white lg:text-xl">
                  {stats.videoCount}
                </p>
              </div>
            </div>

            <StorageMeter
              usedBytes={stats.storageUsedBytes}
              limitBytes={stats.storageLimitBytes}
              usedPercent={stats.storageUsedPercent}
            />
          </div>
        </section>
      </div>

      <section className="px-3 pb-24 pt-3.5 lg:px-8 lg:pb-8 lg:pt-4">
        <div className="mx-auto max-w-3xl space-y-3.5 lg:space-y-4">
          <QuickActions eventId={id} />
          <ActivityTimeline
            items={gallery.items}
            eventId={id}
            totalCount={gallery.totalCount}
            nextCursor={gallery.nextCursor}
          />
        </div>
      </section>
    </>
  );
}
