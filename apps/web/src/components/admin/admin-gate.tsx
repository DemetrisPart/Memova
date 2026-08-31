"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/api/dashboard-client";
import { getCoupleAccessToken } from "@/lib/auth/couple-session-storage";

/**
 * Gates /admin to PLATFORM_ADMIN. Works with cookies or Mobile Preview bearer tokens.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!getCoupleAccessToken()) {
          // Cookie session may still work via credentials: include
        }
        const me = await fetchMe();
        if (cancelled) return;
        if (me.role !== "PLATFORM_ADMIN") {
          router.replace("/dashboard");
          return;
        }
        setEmail(me.email);
        setReady(true);
      } catch {
        if (!cancelled) {
          router.replace("/auth/login?error=session");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#1a1a1a] px-4">
        <p className="text-sm text-stone-400">Checking admin access…</p>
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
            <Link
              href="/admin"
              className="text-sky-300 hover:text-sky-200"
            >
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
