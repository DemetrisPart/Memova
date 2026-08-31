import { type NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/server/api-origin";
import { tokensFromSetCookieHeaders } from "@/lib/server/set-auth-cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSetCookie(raw: string): {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    maxAge?: number;
    path?: string;
  };
} | null {
  const [nameValue, ...parts] = raw.split(";");
  const eqIdx = nameValue.indexOf("=");
  if (eqIdx === -1) return null;

  const options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    maxAge?: number;
    path?: string;
  } = { path: "/" };

  for (const part of parts) {
    const trimmed = part.trim();
    const lower = trimmed.toLowerCase();
    if (lower === "httponly") options.httpOnly = true;
    else if (lower === "secure") options.secure = true;
    else if (lower.startsWith("samesite=")) {
      const value = trimmed.split("=")[1]?.toLowerCase();
      if (value === "strict" || value === "none" || value === "lax") {
        options.sameSite = value;
      }
    } else if (lower.startsWith("max-age=")) {
      const value = Number(trimmed.split("=")[1]);
      if (!Number.isNaN(value)) options.maxAge = value;
    } else if (lower.startsWith("path=")) {
      options.path = trimmed.split("=")[1] ?? "/";
    }
  }

  return {
    name: nameValue.slice(0, eqIdx).trim(),
    value: nameValue.slice(eqIdx + 1).trim(),
    options,
  };
}

export async function GET(request: NextRequest) {
  const pollToken = request.nextUrl.searchParams.get("pollToken")?.trim();
  if (!pollToken) {
    return NextResponse.json({ error: "pollToken required" }, { status: 400 });
  }

  const statusRes = await fetch(
    new URL(
      `/v1/auth/magic-link/status?pollToken=${encodeURIComponent(pollToken)}`,
      `${getApiOrigin()}/`,
    ),
    { cache: "no-store" },
  );
  const statusBody = (await statusRes.json()) as { status?: string };
  return NextResponse.json(statusBody, { status: statusRes.status });
}

/**
 * Completes magic-link poll.
 * API sets HttpOnly cookies only (production parity).
 * This BFF also returns access/refresh in JSON so Mobile Preview
 * (iframe cookies blocked) can keep using sessionStorage + /establish.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = new Headers({ "content-type": "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const upstream = await fetch(
    new URL("/v1/auth/magic-link/complete", `${getApiOrigin()}/`),
    {
      method: "POST",
      headers,
      body,
    },
  );

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  const tokens = tokensFromSetCookieHeaders(setCookies);
  const rawText = await upstream.text();

  let payload: Record<string, unknown> = {};
  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    payload = { message: rawText || "Unexpected response" };
  }

  // Restore client tokens for Mobile Preview without changing API contract.
  if (upstream.ok && tokens) {
    payload = {
      ...payload,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  const response = NextResponse.json(payload, { status: upstream.status });

  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    response.cookies.set(parsed.name, parsed.value, parsed.options);
  }

  return response;
}
