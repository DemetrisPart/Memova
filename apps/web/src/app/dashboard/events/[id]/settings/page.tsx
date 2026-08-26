import { EventSectionKartella } from "@/components/dashboard/event-section-kartella";
import { EventSettingsClient } from "@/components/dashboard/event-settings-client";
import {
  fetchEventServer,
  fetchEventStatsServer,
} from "@/lib/api/server-fetch";
import type { CoupleEvent, EventStats } from "@/lib/api/types";

type SettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventSettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;
  const [event, stats] = await Promise.all([
    fetchEventServer(id) as Promise<CoupleEvent>,
    fetchEventStatsServer(id) as Promise<EventStats>,
  ]);

  return (
    <>
      <EventSectionKartella
        event={event}
        storageUsedPercent={stats.storageUsedPercent}
        title="Settings"
      />
      <section className="px-3 pb-24 pt-3.5 lg:px-8 lg:pb-8 lg:pt-4">
        <div className="mx-auto max-w-3xl">
          <EventSettingsClient event={event} />
        </div>
      </section>
    </>
  );
}
