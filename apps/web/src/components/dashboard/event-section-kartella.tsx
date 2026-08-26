import { EventHealthIndicator } from "@/components/dashboard/event-health-indicator";
import { formatCoupleNames } from "@/lib/utils";
import type { CoupleEvent } from "@/lib/api/types";

type EventSectionKartellaProps = {
  event: CoupleEvent;
  storageUsedPercent: number;
  title: string;
  children?: React.ReactNode;
};

/** Gold overview-style card used across Home / Gallery / QR / Settings */
export function EventSectionKartella({
  event,
  storageUsedPercent,
  title,
  children,
}: EventSectionKartellaProps) {
  return (
    <div className="px-3 pt-3 lg:px-8 lg:pt-4">
      <section className="money-lime-zone mx-auto max-w-3xl overflow-hidden px-3.5 py-3.5 lg:px-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-[#181818] lg:text-base">
            {formatCoupleNames(event.groomName, event.brideName, event.title)}
          </h1>
          <EventHealthIndicator
            storageUsedPercent={storageUsedPercent}
            onLime
          />
        </div>

        <div className="mt-3 space-y-3 lg:mt-3.5 lg:space-y-3.5">
          <h2 className="text-sm font-semibold text-[#181818] lg:text-base">
            {title}
          </h2>
          {children}
        </div>
      </section>
    </div>
  );
}
