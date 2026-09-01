"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register, requestMagicLink } from "@/lib/api/dashboard-client";
import {
  readRememberedEmail,
  saveRememberedEmail,
} from "@/lib/auth/remembered-email";
import { warmupAuthRoutes } from "@/lib/auth/warmup-verify-route";
import { ApiError } from "@/lib/api/types";

const POLL_STORAGE_KEY = "momeva_poll_token";
const AUTH_NEXT_KEY = "momeva_auth_next";

type AuthMode = "login" | "register";

function loginErrorFromQuery(code: string | null): string | null {
  switch (code) {
    case "sign-in":
      return "Sign-in could not be completed. Send a new approval email.";
    case "session":
    case "session-missing":
      return "Sign-in session was incomplete. Please try again.";
    case "pending":
      return "Approve the email first, then return here to continue.";
    case "admin":
      return "Sign in with an admin account to open /admin.";
    default:
      return null;
  }
}

function safeAuthNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authNext = safeAuthNext(searchParams.get("next"));
  const isAdminFlow = authNext === "/admin" || Boolean(authNext?.startsWith("/admin/"));
  const initialMode: AuthMode =
    searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<AuthMode>(
    isAdminFlow ? "login" : initialMode,
  );
  const [email, setEmail] = useState("");
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [useOtherEmail, setUseOtherEmail] = useState(
    isAdminFlow ? false : initialMode === "register",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = loginErrorFromQuery(searchParams.get("error"));
    if (fromQuery) setError(fromQuery);
    const next = safeAuthNext(searchParams.get("next"));
    if (next) sessionStorage.setItem(AUTH_NEXT_KEY, next);
  }, [searchParams]);

  useEffect(() => {
    if (isAdminFlow) {
      setMode("login");
      return;
    }
    const nextMode =
      searchParams.get("mode") === "register" ? "register" : "login";
    setMode(nextMode);
    if (nextMode === "register") {
      setUseOtherEmail(true);
      setEmail("");
    }
  }, [searchParams, isAdminFlow]);

  useEffect(() => {
    const saved = readRememberedEmail();
    if (saved) {
      setRememberedEmail(saved);
      if (searchParams.get("mode") !== "register" || isAdminFlow) {
        setEmail(saved);
        setUseOtherEmail(false);
      }
    } else if (searchParams.get("mode") !== "register" || isAdminFlow) {
      setUseOtherEmail(true);
    }
  }, [searchParams, isAdminFlow]);

  const startAuth = async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const trimmedEmail = address.trim();
      const result =
        mode === "register"
          ? await register(trimmedEmail)
          : await requestMagicLink(trimmedEmail);

      saveRememberedEmail(trimmedEmail);
      setRememberedEmail(trimmedEmail.toLowerCase());

      sessionStorage.setItem(POLL_STORAGE_KEY, result.pollToken);
      void warmupAuthRoutes();
      const params = new URLSearchParams({
        email: trimmedEmail,
      });
      router.push(`/auth/check-email?${params.toString()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startAuth(email);
  };

  const showWelcomeBack =
    mode === "login" && Boolean(rememberedEmail) && !useOtherEmail;

  const primaryBtnClass = isAdminFlow
    ? "!bg-sky-600 !bg-none text-white shadow-[0_10px_24px_rgb(2_132_199_/_35%)] hover:!bg-sky-500 focus-visible:ring-sky-400"
    : "bg-gradient-to-br from-[#d4b896] via-[#c4a574] to-[#9a7a4a] text-[#1a1714] shadow-float hover:from-[#c4a574] hover:via-[#b08f5c] hover:to-[#8a6a3f] focus-visible:ring-[#c4a574]";

  const secondaryBtnClass = isAdminFlow
    ? "!border !border-white/25 !bg-transparent !text-stone-100 hover:!bg-white/10 focus-visible:ring-sky-400"
    : "border-[#d4cabd] bg-[#efe8dc] text-[#1a1714] hover:bg-[#e4d9cb]";

  const formBody = showWelcomeBack ? (
    <>
      <h1
        className={
          isAdminFlow
            ? "text-2xl font-semibold text-white"
            : "mt-4 text-2xl font-semibold text-charcoal-900"
        }
      >
        {isAdminFlow ? "Admin sign in" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-stone-400">
        Continue as{" "}
        <strong
          className={
            isAdminFlow
              ? "font-medium text-sky-200"
              : "font-medium text-[#1a1714]"
          }
        >
          {rememberedEmail}
        </strong>
      </p>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

      <Button
        className={`mt-6 ${primaryBtnClass}`}
        fullWidth
        disabled={loading}
        onClick={() => void startAuth(rememberedEmail ?? "")}
      >
        {loading ? "Sending…" : "Send approval email"}
      </Button>

      {isAdminFlow ? (
        <button
          type="button"
          className="mt-4 w-full text-center text-sm font-medium text-sky-300/90 underline-offset-2 hover:text-sky-200 hover:underline"
          onClick={() => {
            setUseOtherEmail(true);
            setEmail("");
            setError(null);
          }}
        >
          Use a different email
        </button>
      ) : (
        <Button
          className={`mt-4 ${secondaryBtnClass}`}
          variant="secondary"
          fullWidth
          onClick={() => {
            setUseOtherEmail(true);
            setEmail("");
            setError(null);
          }}
        >
          Use a different email
        </Button>
      )}
    </>
  ) : (
    <>
      <h1
        className={
          isAdminFlow
            ? "text-2xl font-semibold text-white"
            : "mt-4 text-2xl font-semibold text-charcoal-900"
        }
      >
        {isAdminFlow
          ? "Admin sign in"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-stone-400">
        {isAdminFlow
          ? "We’ll send an email — tap Approve, then you’ll open Platform admin."
          : mode === "login"
            ? "We’ll send an email — tap Approve to sign in."
            : "Start managing your event photos."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          className={primaryBtnClass}
        >
          {loading ? "Sending…" : "Send approval email"}
        </Button>
      </form>

      {mode === "login" && rememberedEmail ? (
        <button
          type="button"
          className={
            isAdminFlow
              ? "mt-4 w-full text-center text-sm font-medium text-sky-300 hover:underline"
              : "mt-4 w-full text-center text-sm font-medium text-gold-700 hover:underline"
          }
          onClick={() => {
            setEmail(rememberedEmail);
            setUseOtherEmail(false);
            setError(null);
          }}
        >
          Back to {rememberedEmail}
        </button>
      ) : null}

      {!isAdminFlow ? (
        <p className="mt-6 text-center text-sm text-stone-400">
          {mode === "login" ? "New to Momeva?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-gold-700 hover:underline"
            onClick={() => {
              const next = mode === "login" ? "register" : "login";
              setMode(next);
              setError(null);
              if (next === "login" && rememberedEmail) {
                setUseOtherEmail(false);
                setEmail(rememberedEmail);
                router.replace("/auth/login");
              } else {
                setUseOtherEmail(true);
                setEmail("");
                router.replace("/auth/login?mode=register");
              }
            }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      ) : null}
    </>
  );

  if (isAdminFlow) {
    return <AdminAuthShell>{formBody}</AdminAuthShell>;
  }

  return (
    <main className="money-lime-zone flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="panel-3d w-full max-w-md rounded-2xl p-8">
        <Link
          href="/"
          className="text-xs font-medium text-stone-400 hover:text-white"
        >
          ← Momeva
        </Link>
        {formBody}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[#343434] px-4">
          <p className="text-sm text-stone-400">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
