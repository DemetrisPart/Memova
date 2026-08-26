export type PrivacyMode = "OWN_UPLOADS_ONLY" | "ALL_GUESTS";

export type PublicEvent = {
  slug: string;
  title: string;
  brideName: string | null;
  groomName: string | null;
  eventDate: string;
  privacyMode: PrivacyMode;
  showGuestNamesPublicly: boolean;
  storageUsedBytes: string;
  storageLimitBytes: string;
  storageUsedPercent: number;
  coverImageUrl: string | null;
  coverImageUrlLan?: string | null;
  coverImageUrlPublic?: string | null;
};

export type GuestSessionStatus =
  | { active: false }
  | { active: true; firstName: string; lastName: string | null };

export type GuestSessionResponse = {
  firstName: string;
  lastName: string | null;
  expiresInHours: number;
  /** Dev only — when iframe preview blocks HttpOnly cookies (e.g. Mobile Preview). */
  sessionToken?: string;
};

export type GalleryItem = {
  id: string;
  thumbUrl: string | null;
  thumbUrlLan?: string | null;
  thumbUrlPublic?: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  guestLabel: string | null;
  canDelete: boolean;
};

export type GalleryResponse = {
  items: GalleryItem[];
  nextCursor: string | null;
  totalCount: number;
  privacyMode: PrivacyMode;
  showGuestNamesPublicly: boolean;
};

export type UploadInitItem = {
  mediaId: string;
  clientFileId: string;
  uploadUrl: string;
  uploadUrlLan?: string | null;
  uploadUrlPublic?: string | null;
  expiresAt: string;
};

export type UploadInitResponse = {
  batchId: string;
  uploadSessionId: string;
  items: UploadInitItem[];
};

export type UploadCompleteResponse = {
  batchId: string;
  status: "COMPLETED" | "PARTIAL";
  queuedCount: number;
  failedCount: number;
  failed: { mediaId: string; reason: string }[];
};

export type PublicEventQr = {
  slug: string;
  title: string;
  brideName: string | null;
  groomName: string | null;
  eventDate: string;
  eventUrl: string;
  qrCodePngBase64: string;
};

export type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type CoupleEvent = {
  id: string;
  slug: string;
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  status: string;
  privacyMode: PrivacyMode;
  showGuestNamesPublicly: boolean;
  storageUsedBytes: string;
  storageLimitBytes: string;
  coverImageMediaId: string | null;
  coverImageUrl: string | null;
  coverImageUrlLan?: string | null;
  coverImageUrlPublic?: string | null;
  publicUrl: string;
  qrToken?: string;
  createdAt: string;
  updatedAt: string;
};

export type EventStats = {
  photoCount: number;
  videoCount: number;
  storageUsedBytes: string;
  storageLimitBytes: string;
  storageUsedPercent: number;
};

export type EventQrPayload = {
  slug: string;
  eventUrl: string;
  qrCodePngBase64: string;
};

export type CoupleGalleryItem = {
  id: string;
  thumbUrl: string | null;
  thumbUrlLan?: string | null;
  thumbUrlPublic?: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  guestName: string;
  canDelete: boolean;
};

export type CoupleGalleryResponse = {
  items: CoupleGalleryItem[];
  nextCursor: string | null;
  totalCount: number;
};
