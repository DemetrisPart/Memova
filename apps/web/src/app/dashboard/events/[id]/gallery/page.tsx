import { CoupleGalleryClient } from "@/components/dashboard/couple-gallery-client";
import {
  fetchEventServer,
  fetchEventStatsServer,
} from "@/lib/api/server-fetch";
import type { CoupleEvent, EventStats } from "@/lib/api/types";

type GalleryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventGalleryPage({ params }: GalleryPageProps) {
  const { id } = await params;
  const [event, stats] = await Promise.all([
    fetchEventServer(id) as Promise<CoupleEvent>,
    fetchEventStatsServer(id) as Promise<EventStats>,
  ]);

  return (
    <CoupleGalleryClient
      eventId={id}
      event={event}
      storageUsedPercent={stats.storageUsedPercent}
    />
  );
}
