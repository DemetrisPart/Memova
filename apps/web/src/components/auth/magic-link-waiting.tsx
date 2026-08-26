"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveMagicLink } from "@/lib/api/dashboard-client";
import { setCoupleSessionTokens } from "@/lib/auth/couple-session-storage";
import { warmupAuthRoutes } from "@/lib/auth/warmup-verify-route";

type MagicLinkWaitingProps = {
  email: string;
  pollToken: string;
  verificationToken: string;
  onBack: () => void;
};

function finishLockKey(pollToken: string): string {
  return `momeva_auth_finish:${pollToken}`;
}

async function fetchPollStatus(
  pollToken: string,
): Promise<"pending" | "approved" | "completed" | "expired"> {
  const res = await fetch(
    `/api/auth/complete?pollToken=${encodeURIComponent(pollToken)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    return "expired";
  }
  const body = (await res.json()) as { status?: string };
  if (body.status === "approved") return "approved";
  if (body.status === "completed") return "completed";
  if (body.status === "expired") return "expired";
  return "pending";
}

async function completeAndGoToDashboard(pollToken: string): Promise<void> {
  const res = await fetch("/api/auth/complete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollToken }),
  });

  if (res.status === 202) {
    throw new Error("Waiting for email approval");
  }

  if (res.ok) {
    const body = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (body.accessToken && body.refreshToken) {
      setCoupleSessionTokens({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });
      // Best-effort cookies for normal browsers; ignored if iframe blocks them.
      await fetch("/api/auth/establish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
        }),
      }).catch(() => undefined);
    }
  } else if (res.status !== 401) {
    throw new Error("Could not finish sign-in");
  }

  // Same-frame navigation always works in Mobile Preview (unlike target=_top).
  window.location.assign("/dashboard");
}

export function MagicLinkWaiting({
  email,
  pollToken,
  verificationToken,
  onBack,
}: MagicLinkWaitingProps) {
  const [error, setError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const finishedRef = useRef(false);

  const finishSignIn = (force = false) => {
    if (!force && finishedRef.current) return;
    finishedRef.current = true;
    sessionStorage.setItem(finishLockKey(pollToken), "1");

    void completeAndGoToDashboard(pollToken).catch((err) => {
      finishedRef.current = false;
      sessionStorage.removeItem(finishLockKey(pollToken));
      setError(err instanceof Error ? err.message : "Could not finish sign-in");
    });
  };

  useEffect(() => {
    void warmupAuthRoutes();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (sessionStorage.getItem(finishLockKey(pollToken)) === "1") {
      finishedRef.current = true;
      setApproved(true);
      finishSignIn(true);
      return;
    }

    const poll = async () => {
      try {
        const status = await fetchPollStatus(pollToken);
        if (cancelled) return;

        if (status === "completed" || status === "approved") {
          setApproved(true);
          finishSignIn();
          return;
        }

        if (status === "expired") {
          setError("Sign-in request expired. Send a new magic link.");
          return;
        }

        setError(null);
      } catch {
        if (!cancelled) {
          setError("Could not check approval status");
        }
      }

      timeoutId = setTimeout(() => {
        void poll();
      }, 2000);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollToken, verificationToken]);

  const devApprove = async () => {
    setDevLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dev/magic-link?email=${encodeURIComponent(email.trim())}`,
        { cache: "no-store" },
      );
      const body = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !body.token) {
        throw new Error(body.error ?? "Could not load dev approve token");
      }
      await approveMagicLink(body.token);

      for (let attempt = 0; attempt < 15; attempt += 1) {
        const status = await fetchPollStatus(pollToken);
        if (status === "completed" || status === "approved") {
          setApproved(true);
          finishSignIn(true);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      throw new Error("Approved, but sign-in did not complete — try again");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev approve failed");
      finishedRef.current = false;
      sessionStorage.removeItem(finishLockKey(pollToken));
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <main className="money-lime-zone flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="panel-3d w-full max-w-md rounded-2xl p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-charcoal-900">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-stone-400">
          We’ve sent a verification request to your email.
          <br />
          Open the email and{" "}
          <strong className="font-medium text-[#1a1714]">approve</strong> the
          sign-in to continue.
        </p>

        {approved ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f6b4f]/15">
              <Check
                className="h-7 w-7 text-[#1f5c3d]"
                strokeWidth={2.75}
                aria-hidden
              />
            </div>
            <p className="text-sm font-medium text-[#1f5c3d]">Approved</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-600/30 border-t-gold-600" />
            <p className="text-sm text-stone-400">Waiting for approval…</p>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}

        {process.env.NODE_ENV === "development" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
              Dev only
            </p>
            <p className="mt-1 text-sm text-amber-900/80">
              Email goes to Mailpit on your PC. Simulate the inbox approve button
              below.
            </p>
            <Button
              className="mt-4 w-full"
              disabled={devLoading}
              onClick={() => void devApprove()}
            >
              {devLoading ? "Approving…" : "Approve sign in (dev)"}
            </Button>
            <Link
              href="http://localhost:8025"
              className="mt-3 block text-center text-xs font-medium text-amber-900 underline"
              target="_blank"
              rel="noreferrer"
            >
              Open Mailpit
            </Link>
          </div>
        ) : null}

        <Button
          className="mt-6 border-[#d4cabd] bg-[#efe8dc] text-[#1a1714] hover:bg-[#e4d9cb]"
          variant="secondary"
          onClick={onBack}
        >
          Use a different email
        </Button>
      </div>
    </main>
  );
}
