"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { CoupleGalleryClient } from "@/components/dashboard/couple-gallery-client";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  DashboardBottomNav,
  DashboardEventHeader,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-nav";
import { EventHealthIndicator } from "@/components/dashboard/event-health-indicator";
import { EventSettingsClient } from "@/components/dashboard/event-settings-client";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StorageMeter } from "@/components/dashboard/storage-meter";
import { OriginalQrPrintCard } from "@/components/guest/original-qr-print-card";
import { Button } from "@/components/ui/button";
import {
  fetchCoupleGallery,
  fetchEvent,
  fetchEventQr,
  fetchEventStats,
  fetchEvents,
  fetchMe,
} from "@/lib/api/dashboard-client";
import {
  clearCoupleSessionTokens,
  getCoupleAccessToken,
  getCoupleRefreshToken,
} from "@/lib/auth/couple-session-storage";
import { saveRememberedEmail } from "@/lib/auth/remembered-email";
import type {
  AuthUser,
  CoupleEvent,
  CoupleGalleryResponse,
  EventStats,
  PublicEventQr,
} from "@/lib/api/types";
import { formatCoupleNames, formatEventDate } from "@/lib/utils";

type EventSection = "home" | "gallery" | "qr" | "settings";

function sectionFromPath(pathname: string): {
  eventId: string | null;
  section: EventSection;
} {
  const match = pathname.match(
    /^\/dashboard\/events\/([^/]+)(?:\/(gallery|qr|settings))?\/?$/,
  );
  if (!match?.[1] || match[1] === "new") {
    return { eventId: null, section: "home" };
  }
  const section = (match[2] as EventSection | undefined) ?? "home";
  return { eventId: match[1], section };
}

/**
 * Mobile Preview / iframe fallback when HttpOnly cookies are blocked.
 * Uses JWTs from sessionStorage and renders the real dashboard tabs.
 */
export function DashboardBearerShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { eventId, section } = useMemo(
    () => sectionFromPath(pathname),
    [pathname],
  );

  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<CoupleEvent[]>([]);
  const [event, setEvent] = useState<CoupleEvent | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [recentGallery, setRecentGallery] =
    useState<CoupleGalleryResponse | null>(null);
  const [qr, setQr] = useState<PublicEventQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setReady(false);
      setError(null);

      if (!getCoupleAccessToken()) {
        window.location.replace("/auth/login");
        return;
      }

      const refresh = getCoupleRefreshToken();
      const access = getCoupleAccessToken();
      if (access && refresh) {
        await fetch("/api/auth/establish", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: access,
            refreshToken: refresh,
          }),
        }).catch(() => undefined);
      }

      try {
        const me = await fetchMe();
        const list = await fetchEvents();
        if (cancelled) return;

        saveRememberedEmail(me.email);
        setUser(me);
        setEvents(list);

        if (!eventId) {
          if (
            (pathname === "/dashboard" || pathname === "/dashboard/") &&
            list.length === 1 &&
            list[0]?.id
          ) {
            router.replace(`/dashboard/events/${list[0].id}`);
            return;
          }
          setEvent(null);
          setStats(null);
          setRecentGallery(null);
          setQr(null);
          setReady(true);
          return;
        }

        const current = await fetchEvent(eventId);
        if (cancelled) return;
        setEvent(current);

        if (section === "home") {
          const [nextStats, gallery] = await Promise.all([
            fetchEventStats(eventId),
            fetchCoupleGallery(eventId, { limit: 8 }),
          ]);
          if (cancelled) return;
          setStats(nextStats);
          setRecentGallery(gallery);
          setQr(null);
        } else if (section === "qr") {
          const qrPayload = await fetchEventQr(eventId);
          if (cancelled) return;
          setQr({
            slug: current.slug,
            title: current.title,
            brideName: current.brideName,
            groomName: current.groomName,
            eventDate: current.eventDate,
            eventUrl: qrPayload.eventUrl,
            qrCodePngBase64: qrPayload.qrCodePngBase64,
          });
          setStats(null);
          setRecentGallery(null);
        } else {
          setStats(null);
          setRecentGallery(null);
          setQr(null);
        }

        setReady(true);
      } catch {
        if (cancelled) return;
        clearCoupleSessionTokens();
        setError("Could not open dashboard");
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, eventId, section]);

  if (!ready || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold-600/30 border-t-gold-600" />
          <p className="mt-3 text-sm text-stone-400">Opening dashboard…</p>
        </div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-rose-500">{error}</p>
        <Link href="/auth/login" className="text-sm text-gold-700 underline">
          Back to sign in
        </Link>
      </main>
    );
  }

  if (event && eventId) {
    return (
      <div className="min-h-dvh bg-ivory-50">
        <DashboardHeader user={user} />
        <div className="mx-auto flex max-w-6xl">
          <DashboardSidebar event={event} />
          <div className="min-w-0 flex-1 overflow-x-hidden pb-24 lg:pb-8">
            <DashboardEventHeader event={event} />
            <main className="min-w-0 px-3 py-4 lg:px-8 lg:py-6">
              {section === "home" && stats && recentGallery ? (
                <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-charcoal-900 lg:text-lg">
                      Overview
                    </h2>
                    <EventHealthIndicator
                      storageUsedPercent={stats.storageUsedPercent}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-soft lg:rounded-2xl lg:px-4 lg:py-3">
                      <p className="text-xs text-stone-400 lg:text-sm">Photos</p>
                      <p className="mt-0.5 text-xl font-semibold text-charcoal-900 lg:text-2xl">
                        {stats.photoCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-soft lg:rounded-2xl lg:px-4 lg:py-3">
                      <p className="text-xs text-stone-400 lg:text-sm">Videos</p>
                      <p className="mt-0.5 text-xl font-semibold text-charcoal-900 lg:text-2xl">
                        {stats.videoCount}
                      </p>
                    </div>
                  </div>

                  <StorageMeter
                    usedBytes={stats.storageUsedBytes}
                    limitBytes={stats.storageLimitBytes}
                    usedPercent={stats.storageUsedPercent}
                  />

                  <QuickActions eventId={eventId} />
                  <ActivityTimeline
                    items={recentGallery.items}
                    eventId={eventId}
                  />
                </div>
              ) : null}

              {section === "gallery" ? (
                <div className="mx-auto max-w-5xl">
                  <h2 className="mb-3 text-base font-semibold text-charcoal-900 lg:mb-4 lg:text-lg">
                    Gallery
                  </h2>
                  <CoupleGalleryClient eventId={eventId} />
                </div>
              ) : null}

              {section === "qr" && qr ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold text-charcoal-900 lg:mb-6 lg:text-lg">
                    QR & sharing
                  </h2>
                  <div className="guest-page-bg rounded-xl px-3 py-5 lg:rounded-2xl lg:px-4 lg:py-8 print:bg-white print:py-4">
                    <div className="mx-auto max-w-md">
                      <OriginalQrPrintCard qr={qr} />
                    </div>
                  </div>
                </div>
              ) : null}

              {section === "settings" ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold text-charcoal-900 lg:mb-6 lg:text-lg">
                    Settings
                  </h2>
                  <EventSettingsClient event={event} />
                </div>
              ) : null}
            </main>
          </div>
        </div>
        <DashboardBottomNav event={event} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ivory-50">
      <DashboardHeader user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-charcoal-900">
              Your events
            </h1>
            <p className="mt-1 text-sm text-stone-400">
              Manage photos and settings for each celebration.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button>New event</Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center">
            <p className="text-sm text-stone-400">No events yet</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {events.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/dashboard/events/${item.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-charcoal-900">
                      {formatCoupleNames(
                        item.groomName,
                        item.brideName,
                        item.title,
                      )}
                    </p>
                    <p className="text-sm text-stone-400">
                      {formatEventDate(item.eventDate)} · /{item.slug}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
