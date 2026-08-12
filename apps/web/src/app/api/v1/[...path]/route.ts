import { type NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/server/api-origin";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  // Next.js sets this for incoming requests when available (incl. LAN dev)
  const ip = (request as NextRequest & { ip?: string }).ip;
  if (ip) return ip;
  return "unknown";
}

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

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.join("/");
  const url = new URL(`/v1/${path}`, `${getApiOrigin()}/`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const guestToken = request.headers.get("x-guest-session-token");
  if (guestToken) headers.set("x-guest-session-token", guestToken);

  // Mobile Preview: couple JWT from sessionStorage (cookies blocked in iframe).
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  headers.set("x-forwarded-for", getClientIp(request));

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(url.toString(), init);
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }

  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    response.cookies.set(parsed.name, parsed.value, parsed.options);
  }

  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
