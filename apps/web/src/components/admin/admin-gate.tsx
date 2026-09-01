"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMe } from "@/lib/api/dashboard-client";
import { AdminAuthShell } from "@/components/admin/admin-auth-shell";

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
      <AdminAuthShell>
        <p className="text-center text-sm text-stone-400">
          Checking admin access…
        </p>
      </AdminAuthShell>
    );
  }

  if (needsLogin) {
    return (
      <AdminAuthShell>
        <h2 className="text-xl font-semibold text-white">Admin sign in</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">
          Use the magic-link flow with a{" "}
          <span className="text-sky-300">PLATFORM_ADMIN</span> account. You&apos;ll
          return here after approval.
        </p>
        <Link
          href="/auth/login?next=/admin"
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(2_132_199_/_35%)] transition-colors hover:bg-sky-500"
        >
          Continue to admin login
        </Link>
      </AdminAuthShell>
    );
  }

  if (denied) {
    return (
      <AdminAuthShell eyebrow="Access denied">
        <h2 className="text-xl font-semibold text-white">Admin role needed</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">
          Signed in as <span className="text-stone-200">{email}</span>, but this
          account is not <code className="text-sky-300">PLATFORM_ADMIN</code>{" "}
          yet (or the session role is stale).
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          Run{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-stone-300">
            node scripts/promote-admin.mjs {email}
          </code>
          , then sign out and sign in again.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/auth/login?next=/admin"
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Sign in again
          </Link>
          <Link
            href="/dashboard"
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-stone-300 hover:bg-white/10"
          >
            Couple dashboard
          </Link>
        </div>
      </AdminAuthShell>
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
      <div className="mx-auto max-w-5xl min-w-0 overflow-x-hidden px-4 py-6">
        {children}
      </div>
    </div>
  );
}
