import { EventSettingsClient } from "@/components/dashboard/event-settings-client";
import { fetchEventServer } from "@/lib/api/server-fetch";
import type { CoupleEvent } from "@/lib/api/types";

type SettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventSettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;
  const event = (await fetchEventServer(id)) as CoupleEvent;

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-charcoal-900 lg:mb-6 lg:text-lg">
        Settings
      </h2>
      <EventSettingsClient event={event} />
    </div>
  );
}
