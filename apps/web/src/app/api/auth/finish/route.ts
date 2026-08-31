import { type NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/server/api-origin";
import {
  applyAuthTokensToResponse,
  authSuccessHtmlResponse,
  tokensFromSetCookieHeaders,
} from "@/lib/server/set-auth-cookies";
import { getRequestPathUrl } from "@/lib/server/request-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Full-page sign-in finish via poll token — preferred after email approve. */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("warmup") === "1") {
    return new NextResponse(null, { status: 204 });
  }

  const pollToken = request.nextUrl.searchParams.get("pollToken")?.trim();
  if (!pollToken) {
    return NextResponse.redirect(getRequestPathUrl(request, "/auth/login"));
  }

  const upstream = await fetch(
    new URL("/v1/auth/magic-link/complete", `${getApiOrigin()}/`),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pollToken }),
    },
  );

  if (upstream.status === 202) {
    return NextResponse.redirect(
      getRequestPathUrl(request, "/auth/login?error=pending"),
    );
  }

  if (!upstream.ok) {
    return NextResponse.redirect(
      getRequestPathUrl(request, "/auth/login?error=sign-in"),
    );
  }

  const tokens = tokensFromSetCookieHeaders(
    upstream.headers.getSetCookie?.() ?? [],
  );
  if (!tokens) {
    return NextResponse.redirect(
      getRequestPathUrl(request, "/auth/login?error=session"),
    );
  }

  // Explicit HTML handoff (iframe fallback). Default: 303 + Set-Cookie so a
  // top-level form navigation lands on /dashboard already authenticated.
  if (request.nextUrl.searchParams.get("ui") === "1") {
    return authSuccessHtmlResponse(tokens);
  }

  const response = NextResponse.redirect(
    getRequestPathUrl(request, "/dashboard"),
    303,
  );
  applyAuthTokensToResponse(response, tokens);
  return response;
}
