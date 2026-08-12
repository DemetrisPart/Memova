import { type NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/server/api-origin";

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

export async function proxyAuthPost(
  request: NextRequest,
  apiPath: string,
  forwardCookies = false,
): Promise<NextResponse> {
  const body = await request.text();
  const headers = new Headers({ "content-type": "application/json" });

  if (forwardCookies) {
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
  }

  const upstream = await fetch(
    new URL(`/v1/${apiPath.replace(/^\/+/, "")}`, `${getApiOrigin()}/`),
    {
      method: "POST",
      headers,
      body,
    },
  );

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  const response = new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  for (const raw of upstream.headers.getSetCookie?.() ?? []) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    response.cookies.set(parsed.name, parsed.value, parsed.options);
  }

  return response;
}
