import { NextResponse } from "next/server";

const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE ?? "momeva_access";
const REFRESH_COOKIE = process.env.REFRESH_TOKEN_COOKIE ?? "momeva_refresh";

/** Read auth JWTs from upstream Set-Cookie (API no longer returns them in JSON). */
export function tokensFromSetCookieHeaders(
  setCookies: string[],
): { accessToken: string; refreshToken: string } | null {
  let accessToken = "";
  let refreshToken = "";

  for (const raw of setCookies) {
    const nameValue = raw.split(";")[0] ?? "";
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx === -1) continue;
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();
    if (name === ACCESS_COOKIE) accessToken = value;
    if (name === REFRESH_COOKIE) refreshToken = value;
  }

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function applyAuthTokensToResponse(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

/**
 * Sets auth cookies then continues to the dashboard.
 * In Mobile Preview / iframes, Set-Cookie is partitioned or dropped — so we
 * hand tokens to a top-level /auth/handoff via the URL hash (same idea as the
 * guest-session iframe fallback from Memopics).
 */
export function authSuccessHtmlResponse(tokens: {
  accessToken: string;
  refreshToken: string;
}): NextResponse {
  const accessJson = JSON.stringify(tokens.accessToken);
  const refreshJson = JSON.stringify(tokens.refreshToken);
  const handoffPath = `/auth/handoff#access=${encodeURIComponent(tokens.accessToken)}&refresh=${encodeURIComponent(tokens.refreshToken)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Signing in…</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;text-align:center;margin-top:40vh;color:#666">
    Signing you in…
    <a id="continue" href="${handoffPath}" target="_top" rel="noopener">Continue</a>
  </p>
  <script>
(function () {
  var access = ${accessJson};
  var refresh = ${refreshJson};
  var handoff = "/auth/handoff#access=" + encodeURIComponent(access) + "&refresh=" + encodeURIComponent(refresh);
  var inIframe = false;
  try {
    inIframe = window.top !== window.self;
  } catch (e) {
    inIframe = true;
  }

  if (inIframe) {
    // target=_top breaks out of Mobile Preview so cookies are first-party.
    var link = document.getElementById("continue");
    if (link) {
      link.setAttribute("href", handoff);
      link.click();
      return;
    }
    try { window.top.location.replace(handoff); return; } catch (e) {}
    window.location.replace(handoff);
    return;
  }

  window.location.replace("/dashboard");
})();
  </script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
  applyAuthTokensToResponse(response, tokens);
  return response;
}
