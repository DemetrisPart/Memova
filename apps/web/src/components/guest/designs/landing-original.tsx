import { Camera, ChevronRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventHero } from "@/components/guest/event-hero";
import { GuestAccessLabel } from "@/components/guest/guest-access-label";
import { LandingFooter, type LandingDesignProps } from "./landing-shared";

/** Production landing — Mediterranean classic (Αρχικό template) */
export function LandingOriginal({
  event,
  onUpload,
  onGallery,
}: LandingDesignProps) {
  return (
    <div className="guest-classic min-h-dvh bg-ivory-50">
      <EventHero event={event} />

      <section className="relative z-10 mx-auto max-w-lg px-6 pb-10 pt-2 sm:pt-6">
        <div className="glass-card rounded-3xl p-6">
          <GuestAccessLabel className="mb-4" />

          <div className="space-y-3">
            <Button
              fullWidth
              className="min-h-[3.5rem] border-0 !bg-[#e4d9cb] bg-none !from-transparent !to-transparent !text-[#1a1714] shadow-[0_4px_16px_rgb(0_0_0_/_16%)] hover:!bg-[#d8cec2] hover:!from-transparent hover:!to-transparent focus-visible:ring-[#c4a574] text-base"
              onClick={onUpload}
            >
              <Camera className="size-5 text-[#1a1714]" aria-hidden />
              Upload Photos
              <ChevronRight className="ml-auto size-4 text-[#1a1714] opacity-60" aria-hidden />
            </Button>

            <Button
              variant="secondary"
              fullWidth
              className="min-h-10 border-0 !bg-gradient-to-br !from-[#c4a574] !via-[#a68b4b] !to-[#8a6a3f] !text-white px-3.5 py-2 text-[15px] shadow-[inset_1px_1px_0_rgb(255_255_255_/_28%),inset_-1px_-2px_4px_rgb(0_0_0_/_22%),-6px_-4px_14px_rgb(0_0_0_/_12%),0_10px_22px_rgb(0_0_0_/_24%),0_18px_36px_rgb(0_0_0_/_16%)] hover:!from-[#b08f5c] hover:!via-[#8a7340] hover:!to-[#7a5f38] lg:min-h-11 lg:text-base"
              onClick={onGallery}
            >
              <Images className="size-5 text-white" aria-hidden />
              View Gallery
              <ChevronRight className="ml-auto size-4 text-white opacity-70" aria-hidden />
            </Button>
          </div>
        </div>

        <LandingFooter privacyMode={event.privacyMode} className="mt-6" />
      </section>
    </div>
  );
}
