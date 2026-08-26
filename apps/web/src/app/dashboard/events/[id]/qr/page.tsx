import { EventSectionKartella } from "@/components/dashboard/event-section-kartella";
import { OriginalQrPrintCard } from "@/components/guest/original-qr-print-card";
import {
  fetchEventServer,
  fetchEventStatsServer,
  fetchPublicEventQrServer,
} from "@/lib/api/server-fetch";
import type { CoupleEvent, EventStats, PublicEventQr } from "@/lib/api/types";

type QrPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventQrPage({ params }: QrPageProps) {
  const { id } = await params;
  const event = (await fetchEventServer(id)) as CoupleEvent;
  const [stats, qr] = await Promise.all([
    fetchEventStatsServer(id) as Promise<EventStats>,
    fetchPublicEventQrServer(event.slug) as Promise<PublicEventQr>,
  ]);

  return (
    <>
      <EventSectionKartella
        event={event}
        storageUsedPercent={stats.storageUsedPercent}
        title="QR & sharing"
      />
      <section className="px-3 pb-24 pt-3.5 print:p-0 lg:px-8 lg:pb-8 lg:pt-4">
        <div className="guest-page-bg mx-auto max-w-3xl rounded-xl px-3 py-5 print:bg-transparent print:p-0 lg:rounded-2xl lg:px-4 lg:py-8">
          <div className="mx-auto max-w-md print:max-w-none">
            <OriginalQrPrintCard qr={qr} />
          </div>
        </div>
      </section>
    </>
  );
}
