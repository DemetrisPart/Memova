"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminEvents } from "@/lib/api/dashboard-client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import { formatCoupleNames, formatEventDate } from "@/lib/utils";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">All events</h1>
          <p className="mt-1 text-sm text-stone-400">
            Ops view — filter by day when multiple weddings share a date.
          </p>
        </div>
        <label className="block text-sm text-stone-300">
          Event date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-white/15 bg-[#222] px-3 py-2 text-white sm:w-auto"
          />
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
        <ul className="space-y-3">
          {events.map((event) => {
            const cover = event.coverImageUrl
              ? resolveNetworkUrl({
                  url: event.coverImageUrl,
                  lanUrl: event.coverImageUrlLan,
                  publicUrl: event.coverImageUrlPublic,
                })
              : null;
            return (
              <li key={event.id}>
                <Link
                  href={`/admin/events/${event.id}`}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#222] p-3 transition hover:border-sky-500/40"
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {formatCoupleNames(
                        event.groomName,
                        event.brideName,
                        event.title,
                      )}
                    </p>
                    <p className="text-sm text-stone-400">
                      {formatEventDate(event.eventDate)} · /{event.slug} ·{" "}
                      {event.photoCount} photos
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      Owner: {event.ownerEmail}
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
