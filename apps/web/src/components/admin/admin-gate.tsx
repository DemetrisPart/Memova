"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMe } from "@/lib/api/dashboard-client";

/**
 * Gates /admin to PLATFORM_ADMIN. Works with cookies or Mobile Preview bearer tokens.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me.role !== "PLATFORM_ADMIN") {
          setEmail(me.email);
          setDenied(true);
          setReady(true);
          return;
        }
        setEmail(me.email);
        setReady(true);
      } catch {
        if (!cancelled) {
          setNeedsLogin(true);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#1a1a1a] px-4">
        <p className="text-sm text-stone-400">Checking admin access…</p>
      </main>
    );
  }

  if (needsLogin) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#1a1a1a] px-4 text-center">
        <h1 className="text-xl font-semibold text-white">Sign in for admin</h1>
        <p className="max-w-md text-sm text-stone-400">
          Platform admin requires a signed-in session. Use the same magic-link
          flow, then you&apos;ll return here.
        </p>
        <Link
          href="/auth/login?next=/admin"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (denied) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#1a1a1a] px-4 text-center">
        <h1 className="text-xl font-semibold text-white">Admin access needed</h1>
        <p className="max-w-md text-sm text-stone-400">
          Signed in as <span className="text-stone-200">{email}</span>, but this
          account is not <code className="text-sky-300">PLATFORM_ADMIN</code>{" "}
          yet (or the session role is stale).
        </p>
        <p className="max-w-md text-xs text-stone-500">
          Run{" "}
          <code className="text-stone-300">
            node scripts/promote-admin.mjs {email}
          </code>
          , then sign out and sign in again.
        </p>
        <div className="flex gap-3 text-sm">
          <Link
            href="/auth/login?next=/admin"
            className="text-sky-300 hover:underline"
          >
            Sign in again
          </Link>
          <Link href="/dashboard" className="text-stone-400 hover:underline">
            Couple dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#1a1a1a] text-stone-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#141414]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
              Platform admin
            </p>
            <p className="text-lg font-semibold text-white">Momeva</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden truncate text-stone-400 sm:inline">
              {email}
            </span>
            <Link href="/admin" className="text-sky-300 hover:text-sky-200">
              Events
            </Link>
            <Link
              href="/dashboard"
              className="text-stone-400 hover:text-white"
            >
              Couple view
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
