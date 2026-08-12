import { type NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/server/api-origin";
import { proxyAuthPost } from "@/lib/server/auth-api-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  return proxyAuthPost(request, "auth/magic-link/complete", true);
}
