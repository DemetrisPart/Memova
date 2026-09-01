import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser, ApiErrorBody, CoupleEvent } from "./types";
import { ApiError, messageFromApiErrorBody } from "./types";
import { getApiOrigin } from "@/lib/server/api-origin";

async function serverApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiOrigin();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const clientIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    undefined;

  const response = await fetch(`${base}/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = messageFromApiErrorBody(body) ?? message;    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getAuthUserOrNull(): Promise<AuthUser | null> {
  try {
    return await serverApiFetch<AuthUser>("/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUserOrNull();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function fetchEventsServer(): Promise<CoupleEvent[]> {
  return serverApiFetch<CoupleEvent[]>("/events");
}

export async function fetchEventServer(eventId: string): Promise<CoupleEvent> {
  return serverApiFetch<CoupleEvent>(`/events/${encodeURIComponent(eventId)}`);
}

export async function fetchEventStatsServer(eventId: string) {
  return serverApiFetch(`/events/${encodeURIComponent(eventId)}/stats`);
}

export async function fetchEventQrServer(eventId: string) {
  return serverApiFetch(`/events/${encodeURIComponent(eventId)}/qr`);
}

export async function fetchPublicEventQrServer(slug: string) {
  return serverApiFetch(`/public/events/${encodeURIComponent(slug)}/qr`);
}

export async function fetchCoupleGalleryServer(
  eventId: string,
  limit = 10,
) {
  return serverApiFetch(
    `/events/${encodeURIComponent(eventId)}/media?limit=${limit}`,
  );
}
