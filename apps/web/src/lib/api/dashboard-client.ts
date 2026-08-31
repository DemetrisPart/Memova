import type {
  AuthUser,
  CoupleEvent,
  CoupleGalleryResponse,
  EventQrPayload,
  EventStats,
} from "./types";
import { ApiError } from "./types";
import {
  clearCoupleSessionTokens,
  coupleAuthHeaders,
} from "@/lib/auth/couple-session-storage";

function buildApiUrl(path: string): string {
  if (typeof window === "undefined") {
    const raw = (process.env.API_URL ?? "http://localhost:3001").trim();
    const base = raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
    return `${base}/v1${path}`;
  }
  return `/api/v1${path}`;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { credentials?: RequestCredentials },
): Promise<T> {
  const url = buildApiUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  const outerSignal = init?.signal;
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else {
      outerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  let response: Response;
  try {
    const { signal: _signal, ...rest } = init ?? {};
    response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      credentials: init?.credentials ?? "include",
      headers: {
        "Content-Type": "application/json",
        ...coupleAuthHeaders(),
        ...init?.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 0);
    }
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function register(
  email: string,
): Promise<{ message: string; pollToken: string }> {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestMagicLink(
  email: string,
): Promise<{ message: string; pollToken: string }> {
  return apiFetch("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function approveMagicLink(
  token: string,
): Promise<{ message: string }> {
  let response: Response;
  try {
    response = await fetch("/api/auth/approve", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as { message: string };
}

export async function pollMagicLinkComplete(
  pollToken: string,
): Promise<"pending" | "done"> {
  const url =
    typeof window === "undefined"
      ? `${(process.env.API_URL ?? "http://localhost:3001").trim().replace(/\/+$/, "").replace(/\/v1$/i, "")}/v1/auth/magic-link/complete`
      : "/api/auth/complete";
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollToken }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 202) {
    return "pending";
  }

  // Token already consumed — treat as signed in (React strict-mode double poll).
  if (response.status === 401) {
    return "done";
  }

  if (response.status === 404) {
    throw new ApiError("Not found", 404);
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }

  return "done";
}

export async function verifyMagicLink(
  token: string,
): Promise<{ message: string; userId: string }> {
  return apiFetch("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function logout(): Promise<{ message: string }> {
  try {
    return await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    clearCoupleSessionTokens();
  }
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch("/me");
}

export async function fetchEvents(): Promise<CoupleEvent[]> {
  return apiFetch("/events");
}

export async function fetchEvent(eventId: string): Promise<CoupleEvent> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`);
}

export async function fetchEventStats(eventId: string): Promise<EventStats> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/stats`);
}

export async function fetchEventQr(eventId: string): Promise<EventQrPayload> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/qr`);
}

export async function createEvent(data: {
  brideName: string;
  groomName: string;
  eventDate: string;
  slug: string;
  title?: string;
}): Promise<CoupleEvent> {
  return apiFetch("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEvent(
  eventId: string,
  data: {
    brideName?: string;
    groomName?: string;
    eventDate?: string;
    title?: string;
    privacyMode?: "OWN_UPLOADS_ONLY" | "ALL_GUESTS";
    showGuestNamesPublicly?: boolean;
  },
): Promise<CoupleEvent> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function checkSlugAvailability(
  slug: string,
): Promise<{ available: boolean; slug?: string; error?: string }> {
  return apiFetch(`/events/check-slug/${encodeURIComponent(slug)}`);
}

export async function fetchCoupleGallery(
  eventId: string,
  params?: { cursor?: string; limit?: number },
): Promise<CoupleGalleryResponse> {
  const search = new URLSearchParams();
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch(
    `/events/${encodeURIComponent(eventId)}/media${query ? `?${query}` : ""}`,
  );
}

export async function fetchCoupleMediaUrl(
  eventId: string,
  mediaId: string,
  variant: "thumb" | "web" | "original" = "web",
): Promise<{
  url: string;
  urlLan?: string | null;
  urlPublic?: string | null;
  variant: string;
  mediaId: string;
  fileName?: string;
}> {
  return apiFetch(
    `/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}/url?variant=${variant}`,
  );
}

export async function deleteCoupleMedia(
  eventId: string,
  mediaId: string,
): Promise<{ deleted: true; mediaId: string }> {
  return apiFetch(
    `/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}

export async function initCoverUpload(
  eventId: string,
  data: { contentType: string; contentLength: number; fileName?: string },
): Promise<{
  mediaId: string;
  uploadUrl: string;
  uploadUrlLan?: string | null;
  uploadUrlPublic?: string | null;
  expiresAt: string;
}> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/cover/init`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeCoverUpload(
  eventId: string,
  mediaId: string,
): Promise<CoupleEvent> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/cover/complete`, {
    method: "POST",
    body: JSON.stringify({ mediaId }),
  });
}

export function getQrDownloadUrl(eventId: string): string {
  return buildApiUrl(`/events/${encodeURIComponent(eventId)}/qr/download`);
}

export { ApiError };
