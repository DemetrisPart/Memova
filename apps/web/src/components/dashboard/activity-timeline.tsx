"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { CoupleGalleryItem } from "@/lib/api/types";
import { resolveNetworkUrl } from "@/lib/mobile-network";

const PREVIEW_COUNT = 3;

type ActivityTimelineProps = {
  items: CoupleGalleryItem[];
  eventId: string;
};

function thumbUrl(item: CoupleGalleryItem): string | null {
  if (!item.thumbUrl) return null;
  return resolveNetworkUrl({
    url: item.thumbUrl,
    lanUrl: item.thumbUrlLan,
    publicUrl: item.thumbUrlPublic,
  });
}

export function ActivityTimeline({ items, eventId }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center">
        <p className="text-sm text-stone-400">No uploads yet</p>
        <p className="mt-1 text-xs text-stone-400">
          Share your QR code so guests can start uploading.
        </p>
        <Link
          href={`/dashboard/events/${eventId}/qr`}
          className="mt-4 inline-block text-sm font-medium text-gold-700 hover:underline"
        >
          View QR code →
        </Link>
      </div>
    );
  }

  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const canToggle = items.length > PREVIEW_COUNT;

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-soft lg:rounded-2xl">
      <div className="border-b border-stone-200 px-4 py-3 lg:px-5 lg:py-4">
        <h2 className="text-sm font-semibold text-charcoal-900">
          Recent uploads
        </h2>
      </div>
      <ul className="divide-y divide-stone-200">
        {visible.map((item) => {
          const url = thumbUrl(item);
          return (
            <li
              key={item.id}
              className="flex items-center gap-2.5 px-4 py-2.5 lg:gap-3 lg:px-5 lg:py-3"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ivory-100 lg:h-12 lg:w-12">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal-900">
                  {item.guestName}
                </p>
                <p className="text-[11px] text-stone-400 lg:text-xs">
                  Photo uploaded
                </p>
              </div>
              <time
                className="shrink-0 text-[11px] text-stone-400 lg:text-xs"
                dateTime={item.createdAt}
              >
                {formatRelativeTime(item.createdAt)}
              </time>
            </li>
          );
        })}
      </ul>
      {canToggle ? (
        <div className="border-t border-stone-200 px-4 py-2.5 lg:px-5 lg:py-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-gold-700 hover:text-gold-600"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show more
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
