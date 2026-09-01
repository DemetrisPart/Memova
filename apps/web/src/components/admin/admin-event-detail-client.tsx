"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ADMIN_ENTITLEMENTS } from "@momeva/shared";
import {
  fetchAdminEvent,
  fetchAdminGallery,
  updateAdminEventEntitlements,
} from "@/lib/api/dashboard-client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import {
  formatBytes,
  formatCoupleNames,
  formatEventDate,
  formatGalleryVisibleDuration,
  galleryVisibilityNote,
  galleryVisibleUntilDate,
} from "@/lib/utils";
import type { AdminEventDetail, CoupleGalleryItem } from "@/lib/api/types";

type AdminEventDetailClientProps = {
  eventId: string;
};

function storageLimitGb(limitBytes: string): number {
  const bytes = Number(limitBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return ADMIN_ENTITLEMENTS.STORAGE_GB_DEFAULT;
  }
  return Math.round(bytes / (1024 * 1024 * 1024));
}

export function AdminEventDetailClient({
  eventId,
}: AdminEventDetailClientProps) {
  const [event, setEvent] = useState<AdminEventDetail | null>(null);
  const [items, setItems] = useState<CoupleGalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  const applyEntitlements = async (patch: {
    galleryVisibleDays?: number;
    storageLimitGb?: number;
  }) => {
    if (!event) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const updated = await updateAdminEventEntitlements(eventId, patch);
      setEvent(updated);
      setSaveMessage("Entitlements updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update entitlements");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-stone-400">Loading event…</p>;
  }

  if (error && !event) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
        <Link href="/admin" className="text-sm text-sky-300 hover:underline">
          ← All events
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-400" role="alert">
          Event not found
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

  const currentDays = event.galleryVisibleDays ?? 14;
  const currentGb = storageLimitGb(event.storageLimitBytes);
  const usedGb = Math.ceil(
    Number(event.storageUsedBytes) / (1024 * 1024 * 1024),
  );
  const dayPresets = ADMIN_ENTITLEMENTS.GALLERY_VISIBLE_DAYS_PRESETS;
  const storagePresets = ADMIN_ENTITLEMENTS.STORAGE_GB_PRESETS;

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

      <section className="rounded-xl border border-white/10 bg-[#222] p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white">
          Couple rights
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-white">Status</dt>
            <dd className="font-medium text-white">{event.status}</dd>
          </div>
          <div>
            <dt className="text-white">Privacy mode</dt>
            <dd className="font-medium text-white">
              {event.privacyMode === "ALL_GUESTS"
                ? "Shared gallery"
                : "Own uploads only"}
            </dd>
          </div>
          <div>
            <dt className="text-white">Guest names public</dt>
            <dd className="font-medium text-white">
              {event.showGuestNamesPublicly ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-white">Storage</dt>
            <dd className="font-medium text-white">
              {formatBytes(event.storageUsedBytes)} /{" "}
              {formatBytes(event.storageLimitBytes)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-white">Gallery visible</dt>
            <dd className="font-medium text-white">
              {formatGalleryVisibleDuration(currentDays)} after event date{" "}
              <span className="text-rose-500">
                (until{" "}
                {formatEventDate(
                  galleryVisibleUntilDate(event.eventDate, currentDays),
                )}
                )
              </span>
            </dd>
            <p className="mt-1 text-xs text-white/80">
              {galleryVisibilityNote(currentDays)} Display only — not enforced
              yet.
            </p>
          </div>
        </dl>

        <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-sm font-medium text-white">
              Gallery visibility
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Admin only — all options stay available so you can correct a
              wrong pick (max {ADMIN_ENTITLEMENTS.GALLERY_VISIBLE_DAYS_MAX}{" "}
              days).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dayPresets.map((days) => {
                const active = days === currentDays;
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={saving || active}
                    onClick={() =>
                      void applyEntitlements({ galleryVisibleDays: days })
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                        : "border-white/15 text-white hover:border-sky-500/40 hover:bg-sky-500/10"
                    } disabled:opacity-50`}
                  >
                    {formatGalleryVisibleDuration(days)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Storage limit</p>
            <p className="mt-1 text-xs text-stone-400">
              Admin only — all options stay available. Soft max{" "}
              {ADMIN_ENTITLEMENTS.STORAGE_GB_MAX} GB. Cannot go below storage
              already used.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {storagePresets.map((gb) => {
                const active = gb === currentGb;
                const belowUsed = gb < usedGb;
                return (
                  <button
                    key={gb}
                    type="button"
                    disabled={saving || active || belowUsed}
                    title={
                      belowUsed
                        ? `Cannot set below ~${usedGb} GB already used`
                        : undefined
                    }
                    onClick={() =>
                      void applyEntitlements({ storageLimitGb: gb })
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                        : belowUsed
                          ? "border-white/10 text-stone-500"
                          : "border-white/15 text-white hover:border-sky-500/40 hover:bg-sky-500/10"
                    } disabled:opacity-50`}
                  >
                    {gb} GB
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
          {saveMessage ? (
            <p className="text-sm text-emerald-400">{saveMessage}</p>
          ) : null}
          {saving ? (
            <p className="text-xs text-stone-400">Saving…</p>
          ) : null}
        </div>
      </section>

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
