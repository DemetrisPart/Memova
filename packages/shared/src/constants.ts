/** Default MVP limits — hardcoded until payments (V1). */
export const MVP_DEFAULTS = {
  STORAGE_LIMIT_BYTES: 20 * 1024 * 1024 * 1024, // 20 GB
  GALLERY_VISIBLE_DAYS: 14,
  MAX_PHOTO_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_PHOTOS_PER_BATCH: 15,
  MAX_PHOTOS_PER_GUEST_SESSION_HOUR: 100,
  PRESIGNED_UPLOAD_TTL_SECONDS: 900, // 15 min
  PRESIGNED_DOWNLOAD_TTL_SECONDS: 3600, // 1 hr
  GUEST_SESSION_TTL_HOURS: 24,
} as const;

/**
 * Admin-only entitlement caps (extend couple storage / gallery window).
 * Soft max keeps cost + worker load predictable without breaking BigInt/S3.
 */
export const ADMIN_ENTITLEMENTS = {
  /** Default package */
  STORAGE_GB_DEFAULT: 20,
  /** Safe wedding packages — most events never need more than 50 GB */
  STORAGE_GB_PRESETS: [20, 30, 40, 50, 75, 100] as const,
  /** Soft ceiling per event for MVP ops */
  STORAGE_GB_MAX: 100,
  GALLERY_VISIBLE_DAYS_DEFAULT: 14,
  GALLERY_VISIBLE_DAYS_PRESETS: [14, 21, 30, 45, 60, 90] as const,
  GALLERY_VISIBLE_DAYS_MIN: 14,
  GALLERY_VISIBLE_DAYS_MAX: 90,
} as const;

export function gbToBytes(gb: number): bigint {
  return BigInt(gb) * BigInt(1024) * BigInt(1024) * BigInt(1024);
}

export function bytesToGbFloor(bytes: bigint | number | string): number {
  const value = typeof bytes === "bigint" ? bytes : BigInt(bytes);
  return Number(value / (BigInt(1024) * BigInt(1024) * BigInt(1024)));
}

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

export const LOG_CATEGORIES = {
  REQUEST: "request",
  UPLOAD: "upload",
  WORKER: "worker",
  AUTH: "auth",
  METRICS: "metrics",
} as const;

export type LogCategory =
  (typeof LOG_CATEGORIES)[keyof typeof LOG_CATEGORIES];
