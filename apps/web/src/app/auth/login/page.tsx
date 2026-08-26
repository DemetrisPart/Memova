"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register, requestMagicLink } from "@/lib/api/dashboard-client";
import {
  readRememberedEmail,
  saveRememberedEmail,
} from "@/lib/auth/remembered-email";
import { warmupAuthRoutes } from "@/lib/auth/warmup-verify-route";
import { ApiError } from "@/lib/api/types";

const VERIFY_STORAGE_KEY = "momeva_verification_token";

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
    default:
      return null;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [useOtherEmail, setUseOtherEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = loginErrorFromQuery(searchParams.get("error"));
    if (fromQuery) setError(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    const saved = readRememberedEmail();
    if (saved) {
      setRememberedEmail(saved);
      setEmail(saved);
      setUseOtherEmail(false);
    } else {
      setUseOtherEmail(true);
    }
  }, []);

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

      sessionStorage.setItem(VERIFY_STORAGE_KEY, result.verificationToken);
      await warmupAuthRoutes();
      const params = new URLSearchParams({
        pollToken: result.pollToken,
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

  return (
    <main className="money-lime-zone flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="panel-3d w-full max-w-md rounded-2xl p-8">
        <Link
          href="/"
          className="text-xs font-medium text-stone-400 hover:text-white"
        >
          ← Momeva
        </Link>

        {showWelcomeBack ? (
          <>
            <h1 className="mt-4 text-2xl font-semibold text-charcoal-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-stone-400">
              Continue as{" "}
              <strong className="font-medium text-[#1a1714]">
                {rememberedEmail}
              </strong>
            </p>

            {error ? (
              <p className="mt-4 text-sm text-rose-500">{error}</p>
            ) : null}

            <Button
              className="mt-6"
              fullWidth
              disabled={loading}
              onClick={() => void startAuth(rememberedEmail ?? "")}
            >
              {loading ? "Sending…" : "Send approval email"}
            </Button>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-medium text-stone-400 hover:text-charcoal-800"
              onClick={() => {
                setUseOtherEmail(true);
                setEmail("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-semibold text-charcoal-900">
              {mode === "login" ? "Sign in" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-stone-400">
              {mode === "login"
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
              {error ? <p className="text-sm text-rose-500">{error}</p> : null}
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Sending…" : "Send approval email"}
              </Button>
            </form>

            {mode === "login" && rememberedEmail ? (
              <button
                type="button"
                className="mt-4 w-full text-center text-sm font-medium text-gold-700 hover:underline"
                onClick={() => {
                  setEmail(rememberedEmail);
                  setUseOtherEmail(false);
                  setError(null);
                }}
              >
                Back to {rememberedEmail}
              </button>
            ) : null}

            <p className="mt-6 text-center text-sm text-stone-400">
              {mode === "login" ? "New to Momeva?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-medium text-gold-700 hover:underline"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  if (mode === "register" && rememberedEmail) {
                    setUseOtherEmail(false);
                    setEmail(rememberedEmail);
                  } else {
                    setUseOtherEmail(true);
                  }
                }}
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center px-4">
          <p className="text-sm text-stone-400">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
