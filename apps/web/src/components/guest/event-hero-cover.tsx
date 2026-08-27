"use client";

import { resolveNetworkUrl } from "@/lib/mobile-network";

type EventHeroCoverProps = {
  coverImageUrl: string | null;
  coverImageUrlLan?: string | null;
  coverImageUrlPublic?: string | null;
  className?: string;
};

export function EventHeroCover({
  coverImageUrl,
  coverImageUrlLan,
  coverImageUrlPublic,
  className,
}: EventHeroCoverProps) {
  if (!coverImageUrl) {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d4c4a8_0%,_#f9f5ee_55%)]" />
    );
  }

  const src = resolveNetworkUrl({
    url: coverImageUrl,
    lanUrl: coverImageUrlLan,
    publicUrl: coverImageUrlPublic,
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element -- LAN/mobile cover URLs need plain img
    <img
      src={src}
      alt=""
      className={
        className
          ? `absolute inset-0 h-full w-full ${className}`
          : "absolute inset-0 h-full w-full object-cover object-[center_25%]"
      }
    />
  );
}
