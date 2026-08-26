import { OriginalQrPrintCard } from "@/components/guest/original-qr-print-card";
import {
  fetchEventServer,
  fetchPublicEventQrServer,
} from "@/lib/api/server-fetch";
import type { PublicEventQr } from "@/lib/api/types";

type QrPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventQrPage({ params }: QrPageProps) {
  const { id } = await params;
  const event = await fetchEventServer(id);
  const qr = (await fetchPublicEventQrServer(
    event.slug,
  )) as PublicEventQr;

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-charcoal-900 lg:mb-6 lg:text-lg">
        QR & sharing
      </h2>
      <div className="guest-page-bg rounded-xl px-3 py-5 lg:rounded-2xl lg:px-4 lg:py-8 print:bg-white print:py-4">
        <div className="mx-auto max-w-md">
          <OriginalQrPrintCard qr={qr} />
        </div>
      </div>
    </div>
  );
}
