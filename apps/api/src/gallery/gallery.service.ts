import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EventStatus,
  MediaAssetStatus,
  MediaAssetType,
  MediaVariantType,
  PrivacyMode,
  type Prisma,
} from "@momeva/database";
import {
  STORAGE_SERVICE,
  normalizeEventSlug,
  validateEventSlug,
  type StorageService,
} from "@momeva/domain";
import { MVP_DEFAULTS } from "@momeva/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { GuestSessionContext } from "../public/guest-session.guard";

const DEFAULT_GALLERY_LIMIT = 24;

function mimeExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

type GalleryCursor = {
  createdAt: string;
  id: string;
};

type MediaWithVariants = Prisma.MediaAssetGetPayload<{
  include: {
    variants: true;
    guestSession: { select: { firstName: true; lastName: true } };
  };
}>;

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async listGallery(
    slug: string,
    guestSession: GuestSessionContext,
    options: { cursor?: string; limit?: number },
  ) {
    const event = await this.findActiveEventBySlug(slug);

    if (guestSession.eventId !== event.id) {
      throw new NotFoundException("Event not found");
    }

    const limit = options.limit ?? DEFAULT_GALLERY_LIMIT;
    const cursor = options.cursor
      ? this.decodeCursor(options.cursor)
      : undefined;

    const where = this.buildGalleryWhere(event.id, event.privacyMode, guestSession.id);

    const totalCount = await this.prisma.mediaAsset.count({ where });

    const pageWhere: Prisma.MediaAssetWhereInput = cursor
      ? {
          ...where,
          OR: [
            { createdAt: { lt: new Date(cursor.createdAt) } },
            {
              createdAt: new Date(cursor.createdAt),
              id: { lt: cursor.id },
            },
          ],
        }
      : where;

    const media = await this.prisma.mediaAsset.findMany({
      where: pageWhere,
      include: {
        variants: true,
        guestSession: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = media.length > limit;
    const page = hasMore ? media.slice(0, limit) : media;

    const items = await Promise.all(
      page.map((asset) =>
        this.serializeGalleryItem(asset, event, guestSession.id),
      ),
    );

    const lastItem = page.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor({
            createdAt: lastItem.createdAt.toISOString(),
            id: lastItem.id,
          })
        : null;

    return {
      items,
      nextCursor,
      totalCount,
      privacyMode: event.privacyMode,
      showGuestNamesPublicly: event.showGuestNamesPublicly,
    };
  }

  async getMediaUrl(
    slug: string,
    mediaId: string,
    guestSession: GuestSessionContext,
    variant: "thumb" | "web" = "web",
  ) {
    const event = await this.findActiveEventBySlug(slug);

    if (guestSession.eventId !== event.id) {
      throw new NotFoundException("Event not found");
    }

    const where = this.buildGalleryWhere(event.id, event.privacyMode, guestSession.id);

    const media = await this.prisma.mediaAsset.findFirst({
      where: {
        ...where,
        id: mediaId,
      },
      include: { variants: true },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    const variantType =
      variant === "thumb" ? MediaVariantType.THUMB : MediaVariantType.WEB;
    const mediaVariant = media.variants.find((v) => v.variant === variantType);

    if (!mediaVariant) {
      throw new NotFoundException("Media variant not available");
    }

    const urls = await this.storage.getPresignedDownloadUrls({
      key: mediaVariant.storageKey,
      expiresInSeconds: MVP_DEFAULTS.PRESIGNED_DOWNLOAD_TTL_SECONDS,
    });

    return {
      url: urls.url,
      urlLan: urls.lanUrl ?? null,
      urlPublic: urls.publicUrl ?? null,
      variant,
      mediaId: media.id,
      width: media.width,
      height: media.height,
    };
  }

  async deleteGuestMedia(
    slug: string,
    mediaId: string,
    guestSession: GuestSessionContext,
  ) {
    const event = await this.findActiveEventBySlug(slug);

    if (guestSession.eventId !== event.id) {
      throw new NotFoundException("Event not found");
    }

    const media = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaId,
        eventId: event.id,
        guestSessionId: guestSession.id,
        deletedAt: null,
        status: MediaAssetStatus.ACTIVE,
        type: MediaAssetType.PHOTO,
      },
      include: { variants: true },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    await this.softDeleteMedia(event.id, event.coverImageMediaId, media);
    return { deleted: true as const, mediaId: media.id };
  }

  async listCoupleGallery(
    eventId: string,
    options: { cursor?: string; limit?: number },
  ) {
    const limit = options.limit ?? DEFAULT_GALLERY_LIMIT;
    const cursor = options.cursor
      ? this.decodeCursor(options.cursor)
      : undefined;

    const where: Prisma.MediaAssetWhereInput = {
      eventId,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
      type: MediaAssetType.PHOTO,
    };

    const totalCount = await this.prisma.mediaAsset.count({ where });

    const pageWhere: Prisma.MediaAssetWhereInput = cursor
      ? {
          ...where,
          OR: [
            { createdAt: { lt: new Date(cursor.createdAt) } },
            {
              createdAt: new Date(cursor.createdAt),
              id: { lt: cursor.id },
            },
          ],
        }
      : where;

    const media = await this.prisma.mediaAsset.findMany({
      where: pageWhere,
      include: {
        variants: true,
        guestSession: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = media.length > limit;
    const page = hasMore ? media.slice(0, limit) : media;

    const items = await Promise.all(
      page.map((asset) => this.serializeCoupleGalleryItem(asset)),
    );

    const lastItem = page.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor({
            createdAt: lastItem.createdAt.toISOString(),
            id: lastItem.id,
          })
        : null;

    return { items, nextCursor, totalCount };
  }

  async getCoupleMediaUrl(
    eventId: string,
    mediaId: string,
    variant: "thumb" | "web" | "original" = "web",
  ) {
    const media = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaId,
        eventId,
        deletedAt: null,
        status: MediaAssetStatus.ACTIVE,
        type: MediaAssetType.PHOTO,
      },
      include: { variants: true },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    let storageKey: string;

    if (variant === "original") {
      storageKey = media.originalKey;
    } else {
      const variantType =
        variant === "thumb" ? MediaVariantType.THUMB : MediaVariantType.WEB;
      const mediaVariant = media.variants.find((v) => v.variant === variantType);

      if (!mediaVariant) {
        throw new NotFoundException("Media variant not available");
      }

      storageKey = mediaVariant.storageKey;
    }

    const urls = await this.storage.getPresignedDownloadUrls({
      key: storageKey,
      expiresInSeconds: MVP_DEFAULTS.PRESIGNED_DOWNLOAD_TTL_SECONDS,
    });

    const extension = mimeExtension(media.mimeType);
    const fileName = `photo-${media.id}.${extension}`;

    return {
      url: urls.url,
      urlLan: urls.lanUrl ?? null,
      urlPublic: urls.publicUrl ?? null,
      variant,
      mediaId: media.id,
      width: media.width,
      height: media.height,
      fileName,
    };
  }

  async deleteCoupleMedia(eventId: string, mediaId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, coverImageMediaId: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const media = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaId,
        eventId: event.id,
        deletedAt: null,
        status: MediaAssetStatus.ACTIVE,
        type: MediaAssetType.PHOTO,
      },
      include: { variants: true },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    await this.softDeleteMedia(event.id, event.coverImageMediaId, media);
    return { deleted: true as const, mediaId: media.id };
  }

  private async softDeleteMedia(
    eventId: string,
    coverImageMediaId: string | null,
    media: {
      id: string;
      originalSizeBytes: bigint;
      variants: { sizeBytes: bigint }[];
    },
  ) {
    const bytesToFree =
      media.originalSizeBytes +
      media.variants.reduce(
        (sum, variant) => sum + variant.sizeBytes,
        BigInt(0),
      );

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaAsset.update({
        where: { id: media.id },
        data: { deletedAt: new Date() },
      });

      const eventUpdate: Prisma.EventUpdateInput = {
        storageUsedBytes: {
          decrement: bytesToFree,
        },
      };

      if (coverImageMediaId === media.id) {
        eventUpdate.coverImage = { disconnect: true };
      }

      await tx.event.update({
        where: { id: eventId },
        data: eventUpdate,
      });
    });
  }

  private async serializeCoupleGalleryItem(media: MediaWithVariants) {
    const thumbVariant = media.variants.find(
      (v) => v.variant === MediaVariantType.THUMB,
    );

    const thumbUrls = thumbVariant
      ? await this.storage.getPresignedDownloadUrls({
          key: thumbVariant.storageKey,
          expiresInSeconds: MVP_DEFAULTS.PRESIGNED_DOWNLOAD_TTL_SECONDS,
        })
      : null;

    return {
      id: media.id,
      thumbUrl: thumbUrls?.url ?? null,
      thumbUrlLan: thumbUrls?.lanUrl ?? null,
      thumbUrlPublic: thumbUrls?.publicUrl ?? null,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt.toISOString(),
      guestName: this.formatCoupleGuestName(media),
      canDelete: true,
    };
  }

  private formatCoupleGuestName(media: MediaWithVariants): string {
    if (!media.guestSession) {
      return "Guest";
    }

    const { firstName, lastName } = media.guestSession;
    if (lastName?.trim()) {
      return `${firstName} ${lastName.trim()}`;
    }

    return firstName;
  }

  private buildGalleryWhere(
    eventId: string,
    privacyMode: PrivacyMode,
    guestSessionId: string,
  ): Prisma.MediaAssetWhereInput {
    const base: Prisma.MediaAssetWhereInput = {
      eventId,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
      type: MediaAssetType.PHOTO,
    };

    if (privacyMode === PrivacyMode.OWN_UPLOADS_ONLY) {
      return {
        ...base,
        guestSessionId,
      };
    }

    return base;
  }

  private async serializeGalleryItem(
    media: MediaWithVariants,
    event: { privacyMode: PrivacyMode; showGuestNamesPublicly: boolean },
    viewingGuestSessionId: string,
  ) {
    const thumbVariant = media.variants.find(
      (v) => v.variant === MediaVariantType.THUMB,
    );

    const thumbUrls = thumbVariant
      ? await this.storage.getPresignedDownloadUrls({
          key: thumbVariant.storageKey,
          expiresInSeconds: MVP_DEFAULTS.PRESIGNED_DOWNLOAD_TTL_SECONDS,
        })
      : null;

    return {
      id: media.id,
      thumbUrl: thumbUrls?.url ?? null,
      thumbUrlLan: thumbUrls?.lanUrl ?? null,
      thumbUrlPublic: thumbUrls?.publicUrl ?? null,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt.toISOString(),
      guestLabel: this.formatGuestLabel(media, event),
      canDelete: media.guestSessionId === viewingGuestSessionId,
    };
  }

  private formatGuestLabel(
    media: MediaWithVariants,
    event: { privacyMode: PrivacyMode; showGuestNamesPublicly: boolean },
  ): string | null {
    if (event.privacyMode === PrivacyMode.OWN_UPLOADS_ONLY) {
      return null;
    }

    if (!event.showGuestNamesPublicly || !media.guestSession) {
      return "Guest";
    }

    const { firstName, lastName } = media.guestSession;
    if (lastName?.trim()) {
      return `${firstName} ${lastName.trim().charAt(0).toUpperCase()}.`;
    }

    return firstName;
  }

  private encodeCursor(cursor: GalleryCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
  }

  private decodeCursor(cursor: string): GalleryCursor {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as GalleryCursor;

      if (!parsed.createdAt || !parsed.id) {
        throw new Error("Invalid cursor");
      }

      return parsed;
    } catch {
      throw new NotFoundException("Invalid gallery cursor");
    }
  }

  private async findActiveEventBySlug(slug: string) {
    const normalized = normalizeEventSlug(slug);
    const slugResult = validateEventSlug(normalized);
    if (!slugResult.valid || !slugResult.normalized) {
      throw new NotFoundException("Event not found");
    }

    const event = await this.prisma.event.findFirst({
      where: {
        slug: slugResult.normalized,
        deletedAt: null,
        status: EventStatus.ACTIVE,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }
}
