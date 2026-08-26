"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lightbox } from "@/components/guest/lightbox";
import { SquareThumbFrame } from "@/components/guest/square-thumb-frame";
import {
  deleteCoupleMedia,
  fetchCoupleGallery,
  fetchCoupleMediaUrl,
} from "@/lib/api/dashboard-client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import type { CoupleGalleryItem } from "@/lib/api/types";

type CoupleGalleryClientProps = {
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

function toLightboxItem(item: CoupleGalleryItem) {
  return {
    id: item.id,
    thumbUrl: thumbUrl(item),
    canDelete: true,
  };
}

export function CoupleGalleryClient({ eventId }: CoupleGalleryClientProps) {
  const [items, setItems] = useState<CoupleGalleryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadGallery = useCallback(
    async (cursor?: string) => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await fetchCoupleGallery(eventId, { cursor, limit: 24 });
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setTotalCount(data.totalCount);
        setNextCursor(data.nextCursor);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load gallery",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadGallery(nextCursor);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadGallery]);

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId);
    try {
      await deleteCoupleMedia(eventId, mediaId);
      setItems((prev) => prev.filter((item) => item.id !== mediaId));
      setTotalCount((c) => Math.max(0, c - 1));
      setLightboxIndex(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const resolveCoupleWebUrl = useCallback(
    async (item: { id: string; thumbUrl: string | null }) => {
      try {
        const result = await fetchCoupleMediaUrl(eventId, item.id, "web");
        return resolveNetworkUrl({
          url: result.url,
          lanUrl: result.urlLan,
          publicUrl: result.urlPublic,
        });
      } catch {
        return item.thumbUrl;
      }
    },
    [eventId],
  );

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400 lg:text-sm">
          {loading ? "Loading…" : `${totalCount} photos`}
        </p>
        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-xs font-medium text-gold-700 hover:underline lg:hidden"
        >
          ← Overview
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 lg:px-4 lg:py-3">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-stone-200/60"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-6 text-center lg:rounded-2xl lg:p-10">
          <p className="text-sm text-stone-400">No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item, index) => {
            const url = thumbUrl(item);
            return (
              <SquareThumbFrame
                key={item.id}
                className="rounded-lg bg-ivory-100"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-stone-400">
                    …
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="absolute inset-0"
                  aria-label="View photo"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-charcoal-900/60 px-1 py-0.5 text-[10px] text-ivory-50">
                  {item.guestName}
                </span>
              </SquareThumbFrame>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" aria-hidden />
      {loadingMore ? (
        <p className="text-center text-sm text-stone-400">Loading more…</p>
      ) : null}

      {lightboxIndex !== null ? (
        <Lightbox
          items={items.map(toLightboxItem)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          onIndexChange={setLightboxIndex}
          resolveWebUrl={resolveCoupleWebUrl}
          getTitle={(item) =>
            items.find((entry) => entry.id === item.id)?.guestName ?? ""
          }
          floatingClose
          showNavArrows
        />
      ) : null}
    </div>
  );
}
