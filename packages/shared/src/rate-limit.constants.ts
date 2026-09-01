/** Rate limit defaults — override via env in RateLimitService. */
export const RATE_LIMITS = {
  /** Global API requests per IP per minute (gallery/lightbox reads add up quickly). */
  API_GLOBAL_PER_IP_MINUTE: 300,
  /** Guest session creation per IP per hour */
  GUEST_SESSION_CREATE_PER_IP_HOUR: 10,
  /** Upload init requests per guest session per hour */
  UPLOAD_INIT_PER_GUEST_SESSION_HOUR: 30,
  /** Upload complete requests per guest session per hour */
  UPLOAD_COMPLETE_PER_GUEST_SESSION_HOUR: 60,
  /** Magic-link / register requests per IP per hour (email abuse). */
  AUTH_MAGIC_LINK_PER_IP_HOUR: 10,
} as const;

/** Log slow requests above this threshold (ms). */
export const SLOW_REQUEST_THRESHOLD_MS = 3000;

/** HTTP server request timeout (ms). */
export const API_REQUEST_TIMEOUT_MS = 30_000;
