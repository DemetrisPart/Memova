"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fetchCoupleGallery } from "@/lib/api/dashboard-client";
import { formatRelativeTime } from "@/lib/utils";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import type { CoupleGalleryItem } from "@/lib/api/types";

const PREVIEW_COUNT = 3;
const SHOW_MORE_STEP = 5;

type ActivityTimelineProps = {
  items: CoupleGalleryItem[];
  eventId: string;
  totalCount: number;
  nextCursor: string | null;
};

function thumbUrl(item: CoupleGalleryItem): string | null {
  if (!item.thumbUrl) return null;
  return resolveNetworkUrl({
    url: item.thumbUrl,
    lanUrl: item.thumbUrlLan,
    publicUrl: item.thumbUrlPublic,
  });
}

export function ActivityTimeline({
  items: initialItems,
  eventId,
  totalCount: initialTotal,
  nextCursor: initialCursor,
}: ActivityTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [visibleCount, setVisibleCount] = useState(
    Math.min(PREVIEW_COUNT, initialItems.length || PREVIEW_COUNT),
  );
  const [loadingMore, setLoadingMore] = useState(false);

  if (totalCount === 0 && items.length === 0) {
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

  const handleShowMore = async () => {
    if (loadingMore) return;
    const target = Math.min(visibleCount + SHOW_MORE_STEP, totalCount);

    if (items.length >= target) {
      setVisibleCount(target);
      return;
    }

    setLoadingMore(true);
    try {
      let loaded = items;
      let cursor = nextCursor;

      if (!cursor && loaded.length < totalCount) {
        const first = await fetchCoupleGallery(eventId, {
          limit: Math.max(loaded.length, 24),
        });
        loaded = first.items;
        cursor = first.nextCursor;
        setTotalCount(first.totalCount);
      }

      while (loaded.length < target && cursor) {
        const page = await fetchCoupleGallery(eventId, {
          cursor,
          limit: 24,
        });
        loaded = [...loaded, ...page.items];
        cursor = page.nextCursor;
        setTotalCount(page.totalCount);
      }

      setItems(loaded);
      setNextCursor(cursor);
      setVisibleCount(Math.min(target, loaded.length, totalCount));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleShowLess = () => {
    // Scroll to the card first while it is still tall, then collapse —
    // avoids a blank viewport sitting below the shortened list.
    rootRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    setVisibleCount(Math.min(PREVIEW_COUNT, items.length));
  };

  const visible = items.slice(0, visibleCount);
  const showingAll = visibleCount >= totalCount && totalCount > PREVIEW_COUNT;
  const canShowMore = visibleCount < totalCount;
  const canShowLess = visibleCount > PREVIEW_COUNT;

  return (
    <div
      ref={rootRef}
      className="scroll-mt-16 rounded-xl border border-stone-200 bg-white shadow-soft lg:scroll-mt-4 lg:rounded-2xl"
    >
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
      {canShowMore || canShowLess ? (
        <div className="border-t border-stone-200 px-4 py-2.5 lg:px-5 lg:py-3">
          {showingAll ? (
            <button
              type="button"
              onClick={handleShowLess}
              className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-gold-700 hover:text-gold-600"
            >
              Show less
              <ChevronUp className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleShowMore()}
              disabled={loadingMore}
              className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-gold-700 hover:text-gold-600 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Show more"}
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
