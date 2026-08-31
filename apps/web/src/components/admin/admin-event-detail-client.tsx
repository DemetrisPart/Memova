"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminEvent,
  fetchAdminGallery,
} from "@/lib/api/dashboard-client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import { formatCoupleNames, formatEventDate } from "@/lib/utils";
import type { AdminEventDetail, CoupleGalleryItem } from "@/lib/api/types";

type AdminEventDetailClientProps = {
  eventId: string;
};

export function AdminEventDetailClient({
  eventId,
}: AdminEventDetailClientProps) {
  const [event, setEvent] = useState<AdminEventDetail | null>(null);
  const [items, setItems] = useState<CoupleGalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, gallery] = await Promise.all([
          fetchAdminEvent(eventId),
          fetchAdminGallery(eventId, { limit: 48 }),
        ]);
        if (cancelled) return;
        setEvent(detail);
        setItems(gallery.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load event");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return <p className="text-sm text-stone-400">Loading event…</p>;
  }

  if (error || !event) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-400" role="alert">
          {error ?? "Event not found"}
        </p>
        <Link href="/admin" className="text-sm text-sky-300 hover:underline">
          ← All events
        </Link>
      </div>
    );
  }

  const cover = event.coverImageUrl
    ? resolveNetworkUrl({
        url: event.coverImageUrl,
        lanUrl: event.coverImageUrlLan,
        publicUrl: event.coverImageUrlPublic,
      })
    : null;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-sky-300 hover:underline">
        ← All events
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-[#333] sm:h-36 sm:w-28">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-white">
            {formatCoupleNames(
              event.groomName,
              event.brideName,
              event.title,
            )}
          </h1>
          <p className="text-sm text-stone-300">
            {formatEventDate(event.eventDate)} · status {event.status}
          </p>
          <p className="text-sm text-stone-400">
            /{event.slug} · {event.photoCount} photos · {event.videoCount} videos
          </p>
          <p className="text-sm text-stone-400">Owner: {event.ownerEmail}</p>
          <p className="text-sm text-stone-500">
            Storage {event.storageUsedBytes} / {event.storageLimitBytes} bytes
          </p>
          <a
            href={event.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-sky-300 hover:underline"
          >
            Open guest page
          </a>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium text-white">Photos</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">No photos yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6">
            {items.map((item) => {
              const thumb = item.thumbUrl
                ? resolveNetworkUrl({
                    url: item.thumbUrl,
                    lanUrl: item.thumbUrlLan,
                    publicUrl: item.thumbUrlPublic,
                  })
                : null;
              return (
                <div
                  key={item.id}
                  className="aspect-square overflow-hidden rounded-lg bg-[#333]"
                  title={item.guestName}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-500">
                      …
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
