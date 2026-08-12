import { type NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/server/api-origin";
import { authSuccessHtmlResponse } from "@/lib/server/set-auth-cookies";
import { getRequestPathUrl } from "@/lib/server/request-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Pre-compile this route in dev so Fast Refresh does not interrupt the first sign-in. */
export async function HEAD() {
  return new NextResponse(null, { status: 204 });
}

/** Server-side magic-link verify — sets cookies via HTML, relative redirect to dashboard. */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("warmup") === "1") {
    return new NextResponse(null, { status: 204 });
  }

  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(getRequestPathUrl(request, "/auth/login"));
  }

  const upstream = await fetch(new URL("/v1/auth/verify", `${getApiOrigin()}/`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!upstream.ok) {
    return NextResponse.redirect(
      getRequestPathUrl(request, "/auth/login?error=verify"),
    );
  }

  const body = (await upstream.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.redirect(
      getRequestPathUrl(request, "/auth/login?error=session"),
    );
  }

  return authSuccessHtmlResponse({
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  });
}
