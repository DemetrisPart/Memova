import { CalendarDays } from "lucide-react";
import { CoupleNamesHeading } from "@/components/guest/couple-names-heading";
import { EventHeroCover } from "@/components/guest/event-hero-cover";
import { formatEventDate } from "@/lib/utils";
import type { PublicEvent } from "@/lib/api/types";

type EventHeroProps = {
  event: PublicEvent;
};

export function EventHero({ event }: EventHeroProps) {
  return (
    <section className="relative min-h-[68vh] overflow-hidden bg-ivory-50">
      <EventHeroCover
        coverImageUrl={event.coverImageUrl}
        coverImageUrlLan={event.coverImageUrlLan}
        coverImageUrlPublic={event.coverImageUrlPublic}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgb(26 23 20 / 10%) 0%, transparent 28%, transparent 42%, rgb(253 251 247 / 0.25) 58%, rgb(253 251 247 / 0.55) 70%, rgb(253 251 247 / 0.82) 82%, rgb(253 251 247 / 0.96) 92%, #fdfbf7 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 px-6 pb-5 pt-28 sm:pb-8">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-600">
            Celebration
          </p>
          <CoupleNamesHeading
            groomName={event.groomName}
            brideName={event.brideName}
            fallback={event.title}
            className="font-couple mt-2 text-[2.75rem] leading-[1.02] text-charcoal-900 sm:text-[57px]"
          />
          <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-stone-200/80 bg-white/75 px-4 py-2 text-sm text-stone-400 backdrop-blur-sm">
            <CalendarDays className="size-4 text-gold-600" aria-hidden />
            <span>{formatEventDate(event.eventDate)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
