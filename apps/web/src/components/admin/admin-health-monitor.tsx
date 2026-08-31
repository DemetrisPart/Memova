"use client";

import { useEffect, useRef, useState } from "react";

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

function notifyAdmin(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag: "momeva-admin-health",
    });
  } catch {
    // Ignore blocked notifications.
  }
}

export function AdminHealthMonitor() {
  const [state, setState] = useState<HealthUiState>({ kind: "loading" });
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const prevKind = useRef<HealthUiState["kind"] | null>(null);
  const lastNotifyAt = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setNotifyEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await fetchHealth();
        if (cancelled) return;
        const next = classify(data);
        setState(next);

        const wasOk =
          prevKind.current === "ok" || prevKind.current === "loading";
        const isBad = next.kind === "warn" || next.kind === "down";
        if (wasOk && isBad) {
          const now = Date.now();
          if (now - lastNotifyAt.current > NOTIFY_COOLDOWN_MS) {
            lastNotifyAt.current = now;
            const reason =
              next.kind === "down" ? next.reason : next.reason;
            notifyAdmin("Momeva health alert", reason);
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
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifyEnabled(permission === "granted");
    if (permission === "granted") {
      notifyAdmin(
        "Momeva admin alerts on",
        "You’ll get a browser notification if API/DB/queue goes down.",
      );
    }
  };

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
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            System health
          </p>
          <p className={`mt-1 text-sm font-medium ${badge.split(" ").pop()}`}>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}
            >
              {label}
            </span>
          </p>
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
          <p className="text-xs text-stone-500">Browser alerts on</p>
        )}
      </div>

      {(state.kind === "ok" || state.kind === "warn") && (
        <dl className="grid grid-cols-2 gap-2 text-xs text-stone-400 sm:grid-cols-4">
          <div>
            <dt className="text-stone-500">API</dt>
            <dd className="text-stone-200">{state.data.status}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Database</dt>
            <dd className="text-stone-200">{state.data.database}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Queue failed</dt>
            <dd className="text-stone-200">{queue?.failed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Queue waiting</dt>
            <dd className="text-stone-200">{queue?.waiting ?? "—"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
