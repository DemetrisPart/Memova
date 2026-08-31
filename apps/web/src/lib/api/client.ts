import type {
  ApiErrorBody,
  GalleryResponse,
  GuestSessionResponse,
  GuestSessionStatus,
  PublicEvent,
  PublicEventQr,
  UploadCompleteResponse,
  UploadInitResponse,
} from "./types";
import { inferPhotoContentType } from "@/lib/utils";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import {
  getGuestSessionToken,
  setGuestSessionToken,
} from "@/lib/guest-session-storage";
import { ApiError } from "./types";

/** Default request timeout — prevents eternal Loading… / Uploading… on hung TCP. */
const DEFAULT_FETCH_TIMEOUT_MS = 20_000;
const UPLOAD_XHR_TIMEOUT_MS = 120_000;

function getServerApiUrl(): string {
  // Prefer origin without trailing /v1 — callers append /v1/...
  const raw = (process.env.API_URL ?? "http://localhost:3001").trim();
  return raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/** Browser calls same-origin proxy so mobile/LAN testing works without cross-port cookies. */
function getClientApiUrl(): string {
  if (typeof window === "undefined") {
    return getServerApiUrl();
  }
  return "";
}

function resolveApiUrl(): string {
  return getClientApiUrl();
}

function buildApiUrl(path: string): string {
  const base = resolveApiUrl();
  if (base) {
    return `${base}/v1${path}`;
  }
  return `/api/v1${path}`;
}

function guestSessionHeaders(path: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  const match = path.match(/\/public\/events\/([^/]+)/);
  if (!match?.[1]) return {};
  const slug = decodeURIComponent(match[1]);
  const token = getGuestSessionToken(slug);
  return token ? { "X-Guest-Session-Token": token } : {};
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { credentials?: RequestCredentials; timeoutMs?: number },
): Promise<T> {
  const url = buildApiUrl(path);
  const timeoutMs = init?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Merge caller abort with our timeout.
  const outerSignal = init?.signal;
  if (outerSignal) {
    if (outerSignal.aborted) {
      controller.abort();
    } else {
      outerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  let response: Response;
  try {
    const { timeoutMs: _timeoutMs, signal: _signal, ...rest } = init ?? {};
    response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      credentials: init?.credentials ?? "include",
      headers: {
        "Content-Type": "application/json",
        ...guestSessionHeaders(path),
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
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = response.statusText || "Request failed";
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.message === "string") {
      message = body.message;
    } else if (Array.isArray(body.message)) {
      message = body.message.join(", ");
    }
  } catch {
    // ignore parse errors
  }
  return new ApiError(message, response.status);
}

export async function fetchPublicEvent(slug: string): Promise<PublicEvent> {
  return apiFetch<PublicEvent>(`/public/events/${encodeURIComponent(slug)}`, {
    credentials: "omit",
  });
}

export async function fetchPublicEventQr(slug: string): Promise<PublicEventQr> {
  return apiFetch<PublicEventQr>(
    `/public/events/${encodeURIComponent(slug)}/qr`,
    { credentials: "omit" },
  );
}

export async function createGuestSession(
  slug: string,
  data: { firstName: string; lastName?: string },
): Promise<GuestSessionResponse> {
  const result = await apiFetch<GuestSessionResponse>(
    `/public/events/${encodeURIComponent(slug)}/guest-session`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  // Mobile Preview / iframe: cookie may be blocked — keep token for header auth.
  if (result.sessionToken) {
    setGuestSessionToken(slug, result.sessionToken);
  }
  return result;
}

export async function initUpload(
  slug: string,
  data: {
    uploadSessionId: string;
    files: {
      clientFileId: string;
      contentType: string;
      contentLength: number;
      fileName?: string;
    }[];
  },
): Promise<UploadInitResponse> {
  return apiFetch<UploadInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/uploads/init`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function completeUpload(
  slug: string,
  batchId: string,
  data?: { mediaIds?: string[] },
): Promise<UploadCompleteResponse> {
  return apiFetch<UploadCompleteResponse>(
    `/public/events/${encodeURIComponent(slug)}/uploads/${encodeURIComponent(batchId)}/complete`,
    {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    },
  );
}

export async function fetchGallery(
  slug: string,
  params?: { cursor?: string; limit?: number },
): Promise<GalleryResponse> {
  const search = new URLSearchParams();
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch<GalleryResponse>(
    `/public/events/${encodeURIComponent(slug)}/gallery${query ? `?${query}` : ""}`,
  );
}

export async function deleteGalleryMedia(
  slug: string,
  mediaId: string,
): Promise<{ deleted: true; mediaId: string }> {
  return apiFetch<{ deleted: true; mediaId: string }>(
    `/public/events/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}

export async function fetchMediaUrl(
  slug: string,
  mediaId: string,
  variant: "thumb" | "web" = "web",
): Promise<{
  url: string;
  urlLan?: string | null;
  urlPublic?: string | null;
  variant: string;
  mediaId: string;
}> {
  const result = await apiFetch<{
    url: string;
    urlLan?: string | null;
    urlPublic?: string | null;
    variant: string;
    mediaId: string;
  }>(
    `/public/events/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}/url?variant=${variant}`,
  );
  return {
    ...result,
    url: resolveNetworkUrl({
      url: result.url,
      lanUrl: result.urlLan,
      publicUrl: result.urlPublic,
    }),
  };
}

export function resolveUploadUrl(item: {
  uploadUrl: string;
  uploadUrlLan?: string | null;
  uploadUrlPublic?: string | null;
}): string {
  return resolveNetworkUrl({
    url: item.uploadUrl,
    lanUrl: item.uploadUrlLan,
    publicUrl: item.uploadUrlPublic,
  });
}

export async function uploadFileToPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.timeout = UPLOAD_XHR_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", file.type || inferPhotoContentType(file));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
    xhr.send(file);
  });
}

export async function checkGuestSession(slug: string): Promise<boolean> {
  const status = await fetchGuestSessionStatus(slug);
  return status.active;
}

export async function fetchGuestSessionStatus(
  slug: string,
): Promise<GuestSessionStatus> {
  return apiFetch<GuestSessionStatus>(
    `/public/events/${encodeURIComponent(slug)}/guest-session`,
  );
}
