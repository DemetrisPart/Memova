"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { fetchAdminEvents } from "@/lib/api/dashboard-client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import {
  formatCoupleNames,
  formatEventDate,
  formatEventDateDots,
  formatGalleryVisibleDuration,
} from "@/lib/utils";
import type { AdminEventSummary } from "@/lib/api/types";

export function AdminEventsListClient() {
  const [date, setDate] = useState("");
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchAdminEvents(date ? { date } : undefined);
        if (!cancelled) setEvents(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load events");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const dateDisplay = date ? formatEventDateDots(date) : "dd/mm/yyyy";

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-white">All events</h1>
          <p className="mt-1 text-sm text-stone-400">
            Ops view — filter by day when multiple weddings share a date.
          </p>
        </div>
        <label className="block min-w-0 w-full max-w-full text-sm text-stone-300 sm:max-w-[14rem]">
          Event date
          {/* Facade: native date on iOS has huge min-width + no placeholder. */}
          <span className="relative mt-1 block min-w-0 max-w-full overflow-hidden rounded-lg border border-white/15 bg-[#222]">
            <span
              className={`pointer-events-none flex items-center justify-between gap-2 px-3 py-2 text-sm ${
                date ? "text-white" : "text-stone-500"
              }`}
            >
              <span className="min-w-0 truncate">{dateDisplay}</span>
              <Calendar
                className="h-4 w-4 shrink-0 text-stone-500"
                aria-hidden
              />
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 z-10 h-full w-full min-w-0 max-w-full cursor-pointer opacity-0"
            />
          </span>
        </label>
      </div>

      {date ? (
        <button
          type="button"
          className="text-sm text-sky-300 hover:underline"
          onClick={() => setDate("")}
        >
          Clear date filter
        </button>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-stone-400">
          No events{date ? ` on ${formatEventDate(date)}` : ""}.
        </p>
      ) : (
        <ul className="min-w-0 space-y-3">
          {events.map((event) => {
            const cover = event.coverImageUrl
              ? resolveNetworkUrl({
                  url: event.coverImageUrl,
                  lanUrl: event.coverImageUrlLan,
                  publicUrl: event.coverImageUrlPublic,
                })
              : null;
            return (
              <li key={event.id} className="min-w-0">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#222] p-3 transition hover:border-sky-500/40 sm:gap-4"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#333]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate font-medium text-white">
                      {formatCoupleNames(
                        event.groomName,
                        event.brideName,
                        event.title,
                      )}
                    </p>
                    <p className="truncate text-sm text-stone-400">
                      {formatEventDate(event.eventDate)} · /{event.slug} ·{" "}
                      {event.photoCount} photos
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      Visible {formatGalleryVisibleDuration(event.galleryVisibleDays ?? 14)} ·{" "}
                      {event.privacyMode === "ALL_GUESTS"
                        ? "Shared gallery"
                        : "Own uploads only"}{" "}
                      · Owner: {event.ownerEmail}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
