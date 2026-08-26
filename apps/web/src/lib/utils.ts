import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * UUID for client-side IDs (upload sessions, file refs).
 * crypto.randomUUID requires a secure context — unavailable on mobile LAN over HTTP.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function inferPhotoContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}

export function formatEventDate(isoDate: string): string {
  const dateOnly = isoDate.slice(0, 10);
  const date = new Date(`${dateOnly}T12:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const SLUG_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Normalize free text into a URL slug segment. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Exact calendar date for slugs, e.g. 2026-10-03 → "3-oct-2026". */
export function eventDateSlugPart(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.slice(0, 10));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day}-${SLUG_MONTHS[month - 1]}-${year}`;
}

/**
 * Suggested production event URL from names + exact event date.
 * Example: demetris-daniella-3-oct-2026
 */
export function buildSuggestedEventSlug(
  groomName: string,
  brideName: string,
  eventDate: string,
): string {
  const names = slugify(`${groomName}-${brideName}`);
  const datePart = eventDateSlugPart(eventDate);
  if (!names && !datePart) return "";
  if (!names) return datePart ?? "";
  if (!datePart) return names;
  return slugify(`${names}-${datePart}`).slice(0, 60);
}

export function formatCoupleNames(
  groomName: string | null | undefined,
  brideName: string | null | undefined,
  fallback = "Our Event",
): string {
  const groom = groomName?.trim();
  const bride = brideName?.trim();

  if (groom && bride) return `${groom} & ${bride}`;
  if (groom) return groom;
  if (bride) return bride;
  return fallback;
}

export function formatGuestName(firstName: string, lastName?: string | null): string {
  if (lastName?.trim()) {
    return `${firstName} ${lastName.trim()}`;
  }
  return firstName;
}

export function storageRemainingLabel(
  usedBytes: string,
  limitBytes: string,
): string {
  const used = BigInt(usedBytes);
  const remaining = BigInt(limitBytes) - used;
  if (remaining <= 0n) {
    return "0 MB remaining";
  }

  const gb = Number(remaining) / (1024 * 1024 * 1024);
  if (gb >= 1) {
    // Two decimals once anything is used so 46.7 MB → 19.95 GB, not 20.0 GB.
    return `${gb.toFixed(used > 0n ? 2 : 1)} GB remaining`;
  }

  const mb = Number(remaining) / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB remaining`;
  }

  const kb = Number(remaining) / 1024;
  return `${Math.max(0, Math.round(kb))} KB remaining`;
}

export function storageUsedPercent(
  usedBytes: string | bigint | number,
  limitBytes: string | bigint | number,
): number {
  const used = Number(usedBytes);
  const limit = Number(limitBytes);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

export function formatBytes(bytes: string | bigint | number): string {
  const value = typeof bytes === "bigint" ? Number(bytes) : Number(bytes);
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Copy text for mobile LAN / HTTP / iframe previews where
 * navigator.clipboard often fails outside a secure context.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function" &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

