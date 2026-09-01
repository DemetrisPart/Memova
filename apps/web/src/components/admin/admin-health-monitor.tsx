"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchAdminFailures } from "@/lib/api/dashboard-client";
import type { AdminFailureItem } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/utils";

export type HealthSnapshot = {
  status: string;
  service: string;
  database: string;
  queue?: {
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  };
};

type HealthUiState =
  | { kind: "loading" }
  | { kind: "ok"; data: HealthSnapshot }
  | { kind: "warn"; data: HealthSnapshot; reason: string }
  | { kind: "down"; reason: string };

const POLL_MS = 15_000;
const NOTIFY_COOLDOWN_MS = 60_000;
const READ_FAILURES_STORAGE_KEY = "momeva-admin-failures-read";

function formatStatusValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ok") {
    return { text: "OK", className: "font-semibold text-emerald-400" };
  }
  return { text: value.toUpperCase(), className: "font-semibold text-rose-400" };
}

function classify(data: HealthSnapshot): HealthUiState {
  if (data.database !== "ok") {
    return { kind: "warn", data, reason: "Database is not healthy" };
  }
  if (!data.queue) {
    return { kind: "warn", data, reason: "Media queue unreachable" };
  }
  if (data.queue.failed > 0) {
    return {
      kind: "warn",
      data,
      reason: `${data.queue.failed} failed media jobs in queue`,
    };
  }
  if (data.status !== "ok") {
    return { kind: "warn", data, reason: "API reports degraded status" };
  }
  return { kind: "ok", data };
}

async function fetchHealth(): Promise<HealthSnapshot> {
  const res = await fetch("/api/v1/health", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return (await res.json()) as HealthSnapshot;
}

function notifyAdmin(title: string, body: string, tag = "momeva-admin-health") {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag });
  } catch {
    // Ignore blocked notifications.
  }
}

function failureKey(item: AdminFailureItem) {
  return `${item.source}:${item.id}:${item.failedAt}`;
}

function loadReadFailureKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_FAILURES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function saveReadFailureKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      READ_FAILURES_STORAGE_KEY,
      JSON.stringify([...keys]),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function AdminHealthMonitor() {
  const [state, setState] = useState<HealthUiState>({ kind: "loading" });
  const [failures, setFailures] = useState<AdminFailureItem[]>([]);
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyHint, setNotifyHint] = useState<string | null>(null);
  const prevKind = useRef<HealthUiState["kind"] | null>(null);
  const lastNotifyAt = useRef(0);
  const notifiedFailureKeys = useRef<Set<string> | null>(null);

  useEffect(() => {
    setReadKeys(loadReadFailureKeys());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !window.isSecureContext) {
      setNotifyHint(
        "Browser alerts need HTTPS or localhost (not available on LAN HTTP / some previews).",
      );
      return;
    }
    setNotifyEnabled(Notification.permission === "granted");
    if (Notification.permission === "denied") {
      setNotifyHint(
        "Notifications blocked — allow them for this site in browser settings.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const [data, failurePayload] = await Promise.all([
          fetchHealth(),
          fetchAdminFailures({ limit: 8 }).catch(() => null),
        ]);
        if (cancelled) return;

        const next = classify(data);
        setState(next);

        if (failurePayload) {
          setFailures(failurePayload.items);
          const keys = failurePayload.items.map(failureKey);
          if (notifiedFailureKeys.current === null) {
            notifiedFailureKeys.current = new Set(keys);
          } else {
            const fresh = failurePayload.items.filter(
              (item) => !notifiedFailureKeys.current!.has(failureKey(item)),
            );
            for (const item of fresh) {
              notifiedFailureKeys.current.add(failureKey(item));
              const slug = item.eventSlug ? `/${item.eventSlug}` : "unknown event";
              notifyAdmin(
                "Momeva upload failed",
                `${slug}: ${item.reason}`,
                `momeva-fail-${item.id}`,
              );
            }
          }
        }

        const wasOk =
          prevKind.current === "ok" || prevKind.current === "loading";
        const isBad = next.kind === "warn" || next.kind === "down";
        if (wasOk && isBad) {
          const now = Date.now();
          if (now - lastNotifyAt.current > NOTIFY_COOLDOWN_MS) {
            lastNotifyAt.current = now;
            notifyAdmin(
              "Momeva health alert",
              next.kind === "down" ? next.reason : next.reason,
            );
          }
        }
        prevKind.current = next.kind;
      } catch {
        if (cancelled) return;
        const next: HealthUiState = {
          kind: "down",
          reason: "API unreachable — check servers / network",
        };
        setState(next);
        const wasOk =
          prevKind.current === "ok" || prevKind.current === "loading";
        if (wasOk) {
          const now = Date.now();
          if (now - lastNotifyAt.current > NOTIFY_COOLDOWN_MS) {
            lastNotifyAt.current = now;
            notifyAdmin("Momeva health alert", next.reason);
          }
        }
        prevKind.current = "down";
      }

      timeoutId = setTimeout(() => {
        void tick();
      }, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const enableNotifications = async () => {
    if (typeof window === "undefined") return;

    if (!window.isSecureContext || !("Notification" in window)) {
      setNotifyHint(
        "Browser alerts need HTTPS or localhost (not available on LAN HTTP / some previews).",
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifyEnabled(permission === "granted");
      if (permission === "granted") {
        setNotifyHint(null);
        notifyAdmin(
          "Momeva admin alerts on",
          "You’ll get a browser notification if health drops or an upload fails.",
        );
        return;
      }
      if (permission === "denied") {
        setNotifyHint(
          "Notifications blocked — allow them for this site in browser settings.",
        );
        return;
      }
      setNotifyHint("Permission not granted yet — try again and choose Allow.");
    } catch {
      setNotifyHint("Could not request notification permission in this browser.");
    }
  };

  const clearUnreadFailures = () => {
    const next = new Set(readKeys);
    for (const item of failures) {
      next.add(failureKey(item));
    }
    setReadKeys(next);
    saveReadFailureKeys(next);
  };

  const unreadCount = failures.filter(
    (item) => !readKeys.has(failureKey(item)),
  ).length;
  const hasUnread = unreadCount > 0;

  const badge =
    state.kind === "ok"
      ? "bg-emerald-500/20 text-emerald-300"
      : state.kind === "loading"
        ? "bg-stone-500/20 text-stone-300"
        : "bg-rose-500/20 text-rose-300";

  const label =
    state.kind === "ok"
      ? "All systems OK"
      : state.kind === "loading"
        ? "Checking…"
        : state.kind === "down"
          ? state.reason
          : state.reason;

  const queue = state.kind === "ok" || state.kind === "warn" ? state.data.queue : null;

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-[#222] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            System health
          </p>
          <span
            className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}
          >
            <span className="truncate">{label}</span>
          </span>
        </div>
        {!notifyEnabled ? (
          <button
            type="button"
            onClick={() => void enableNotifications()}
            className="rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/10"
          >
            Enable browser alerts
          </button>
        ) : (
          <p className="text-xs text-emerald-400/90">Browser alerts on</p>
        )}
      </div>

      {notifyHint ? (
        <p className="text-xs leading-relaxed text-amber-300/90">{notifyHint}</p>
      ) : null}

      {(state.kind === "ok" || state.kind === "warn") && (
        <dl className="grid grid-cols-2 gap-2 text-xs text-stone-400 sm:grid-cols-4">
          <div>
            <dt className="text-stone-400">API</dt>
            <dd className={formatStatusValue(state.data.status).className}>
              {formatStatusValue(state.data.status).text}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400">Database</dt>
            <dd className={formatStatusValue(state.data.database).className}>
              {formatStatusValue(state.data.database).text}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400">Queue failed</dt>
            <dd className="text-white">{queue?.failed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-400">Queue waiting</dt>
            <dd className="text-white">{queue?.waiting ?? "—"}</dd>
          </div>
        </dl>
      )}

      <div className="border-t border-white/10 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-white">
          Recent upload failures
        </p>

        <div className="mt-2 flex items-center gap-2">
          {hasUnread ? (
            <p className="text-xs font-medium text-rose-500">
              {unreadCount === 1
                ? "1 unread failure"
                : `${unreadCount} unread failures`}
            </p>
          ) : (
            <p className="text-xs font-medium text-emerald-400">
              No recent failures
            </p>
          )}
          <button
            type="button"
            onClick={clearUnreadFailures}
            disabled={!hasUnread}
            title={
              hasUnread
                ? "Mark unread failures as read"
                : "No unread failures"
            }
            aria-label={
              hasUnread
                ? `Mark ${unreadCount} unread failures as read`
                : "No unread failures"
            }
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition ${
              hasUnread
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-emerald-500/25 text-emerald-400"
            } ${hasUnread ? "cursor-pointer" : "cursor-default"}`}
          >
            {unreadCount}
          </button>
        </div>

        {failures.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {failures.map((item) => {
              const key = failureKey(item);
              const unread = !readKeys.has(key);
              return (
                <li
                  key={key}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    unread
                      ? "border-rose-500/35 bg-rose-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    {item.eventId && item.eventSlug ? (
                      <Link
                        href={`/admin/events/${item.eventId}`}
                        className="font-medium text-sky-300 hover:underline"
                      >
                        /{item.eventSlug}
                      </Link>
                    ) : (
                      <span className="font-medium text-white">
                        {item.eventSlug ? `/${item.eventSlug}` : "Unknown event"}
                      </span>
                    )}
                    <span className="text-stone-400">
                      {formatRelativeTime(item.failedAt)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-rose-200/90">{item.reason}</p>
                  {item.mediaId ? (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-stone-400">
                      {item.mediaId}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="mt-2 text-[11px] text-stone-400">
          Platform admins also get an email when an upload fails permanently.
          Tap the number to clear unread.
        </p>
      </div>
    </div>
  );
}
