import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  EventStatus,
  MediaAssetStatus,
  MediaAssetType,
  Prisma,
  PrivacyMode,
  type Event,
  type MediaAsset,
} from "@momeva/database";
import {
  STORAGE_SERVICE,
  buildEventTitle,
  buildMediaOriginalKey,
  detectMimeFromBuffer,
  extensionFromMimeType,
  MIME_SNIFF_BYTE_LENGTH,
  mimeMatchesDeclared,
  normalizeEventSlug,
  validateEventSlug,
  type StorageService,
} from "@momeva/domain";
import { ALLOWED_PHOTO_MIME_TYPES, MVP_DEFAULTS } from "@momeva/shared";
import { generateSecureToken } from "../common/crypto.util";
import { PrismaService } from "../prisma/prisma.service";
import { QrService } from "./qr.service";
import type { CoverUploadInitDto, CreateEventDto, UpdateEventDto } from "./dto/event.dto";

type EventWithCover = Event & {
  coverImage: MediaAsset | null;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly qrService: QrService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async createEvent(ownerUserId: string, dto: CreateEventDto) {
    // Product rule: 1 couple account = 1 event (extra celebrations → new registration).
    const existing = await this.prisma.event.findFirst({
      where: { ownerUserId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        "This account already has an event. Sign up with a different email to create another.",
      );
    }

    const slugResult = validateEventSlug(dto.slug);
    if (!slugResult.valid || !slugResult.normalized) {
      throw new BadRequestException(slugResult.error ?? "Invalid event URL");
    }

    const slugTaken = await this.isSlugTaken(slugResult.normalized);
    if (slugTaken) {
      throw new ConflictException("This event URL is already taken");
    }

    const title =
      dto.title?.trim() ||
      buildEventTitle(dto.brideName, dto.groomName);

    let event: EventWithCover;
    try {
      event = await this.prisma.event.create({
        data: {
          slug: slugResult.normalized,
          qrToken: generateSecureToken(24),
          ownerUserId,
          brideName: dto.brideName.trim(),
          groomName: dto.groomName.trim(),
          title,
          eventDate: new Date(dto.eventDate),
          status: EventStatus.ACTIVE,
          privacyMode: PrivacyMode.OWN_UPLOADS_ONLY,
          storageLimitBytes: BigInt(MVP_DEFAULTS.STORAGE_LIMIT_BYTES),
        },
        include: { coverImage: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("This event URL is already taken");
      }
      throw error;
    }

    return this.serializeEvent(event, { includeQrToken: true });
  }

  async checkSlugAvailability(input: string) {
    const result = validateEventSlug(input);
    if (!result.valid || !result.normalized) {
      return { available: false, slug: result.normalized, error: result.error };
    }

    const taken = await this.isSlugTaken(result.normalized);

    return {
      available: !taken,
      slug: result.normalized,
      error: taken ? "This event URL is already taken" : undefined,
    };
  }

  async listEvents(ownerUserId: string) {
    const events = await this.prisma.event.findMany({
      where: {
        ownerUserId,
        deletedAt: null,
        status: { not: EventStatus.DELETED },
      },
      orderBy: { createdAt: "desc" },
      include: { coverImage: true },
    });

    return Promise.all(events.map((event) => this.serializeEvent(event)));
  }

  async getEventById(eventId: string, ownerUserId: string) {
    const event = await this.findOwnedEvent(eventId, ownerUserId);
    return this.serializeEvent(event, { includeQrToken: true });
  }

  async updateEvent(
    eventId: string,
    ownerUserId: string,
    dto: UpdateEventDto,
  ) {
    const existing = await this.findOwnedEvent(eventId, ownerUserId);

    const brideName = dto.brideName?.trim() ?? existing.brideName;
    const groomName = dto.groomName?.trim() ?? existing.groomName;
    const title =
      dto.title?.trim() ??
      buildEventTitle(brideName, groomName, existing.title);

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        brideName,
        groomName,
        title,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        privacyMode: dto.privacyMode,
        showGuestNamesPublicly: dto.showGuestNamesPublicly,
      },
      include: { coverImage: true },
    });

    return this.serializeEvent(event, { includeQrToken: true });
  }

  async getEventStats(eventId: string, ownerUserId: string) {
    const event = await this.findOwnedEvent(eventId, ownerUserId);

    const [photoCount, videoCount] = await Promise.all([
      this.prisma.mediaAsset.count({
        where: {
          eventId,
          deletedAt: null,
          type: MediaAssetType.PHOTO,
          status: MediaAssetStatus.ACTIVE,
        },
      }),
      this.prisma.mediaAsset.count({
        where: {
          eventId,
          deletedAt: null,
          type: MediaAssetType.VIDEO,
          status: MediaAssetStatus.ACTIVE,
        },
      }),
    ]);

    return {
      photoCount,
      videoCount,
      storageUsedBytes: event.storageUsedBytes.toString(),
      storageLimitBytes: event.storageLimitBytes.toString(),
      storageUsedPercent: Number(
        (event.storageUsedBytes * BigInt(100)) / event.storageLimitBytes,
      ),
    };
  }

  async getQrPayload(eventId: string, ownerUserId: string) {
    const event = await this.findOwnedEvent(eventId, ownerUserId);
    const eventUrl = this.qrService.getEventPublicUrl(event.slug);
    const qrCodePngBase64 = await this.qrService.generatePngBase64(eventUrl);

    return {
      slug: event.slug,
      eventUrl,
      qrCodePngBase64,
    };
  }

  async getQrPngBuffer(eventId: string, ownerUserId: string): Promise<Buffer> {
    const event = await this.findOwnedEvent(eventId, ownerUserId);
    const eventUrl = this.qrService.getEventPublicUrl(event.slug);
    return this.qrService.generatePngBuffer(eventUrl);
  }

  async initCoverUpload(
    eventId: string,
    ownerUserId: string,
    dto: CoverUploadInitDto,
  ) {
    const event = await this.findOwnedEvent(eventId, ownerUserId);

    if (
      !ALLOWED_PHOTO_MIME_TYPES.includes(
        dto.contentType as (typeof ALLOWED_PHOTO_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException("Unsupported image type for cover photo");
    }

    if (dto.contentLength > MVP_DEFAULTS.MAX_PHOTO_SIZE_BYTES) {
      throw new BadRequestException("Cover photo exceeds maximum size");
    }

    const mediaId = randomUUID();
    const extension = extensionFromMimeType(dto.contentType);
    const env = this.config.get<string>("APP_ENV", "development");
    const storageKey = buildMediaOriginalKey(env, event.id, mediaId, extension);

    const media = await this.prisma.mediaAsset.create({
      data: {
        id: mediaId,
        eventId: event.id,
        type: MediaAssetType.PHOTO,
        status: MediaAssetStatus.PENDING,
        originalKey: storageKey,
        originalSizeBytes: BigInt(dto.contentLength),
        mimeType: dto.contentType,
      },
    });

    const presigned = await this.storage.getPresignedUploadUrl({
      key: storageKey,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });

    return {
      mediaId: media.id,
      uploadUrl: presigned.url,
      uploadUrlLan: presigned.lanUrl ?? null,
      uploadUrlPublic: presigned.publicUrl ?? null,
      expiresAt: presigned.expiresAt.toISOString(),
    };
  }

  async completeCoverUpload(
    eventId: string,
    ownerUserId: string,
    mediaId: string,
  ) {
    const event = await this.findOwnedEvent(eventId, ownerUserId);

    const media = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaId,
        eventId: event.id,
        deletedAt: null,
        type: MediaAssetType.PHOTO,
      },
    });

    if (!media) {
      throw new NotFoundException("Cover upload not found");
    }

    const exists = await this.storage.objectExists(media.originalKey);
    if (!exists) {
      throw new BadRequestException(
        "Cover photo upload not found in storage. Upload the file first.",
      );
    }

    const sniffBuffer = await this.storage.getObjectBuffer({
      key: media.originalKey,
      maxBytes: MIME_SNIFF_BYTE_LENGTH,
    });
    const detected = detectMimeFromBuffer(sniffBuffer);
    if (!mimeMatchesDeclared(detected, media.mimeType)) {
      await this.prisma.mediaAsset.update({
        where: { id: media.id },
        data: { status: MediaAssetStatus.QUARANTINED },
      });
      throw new BadRequestException(
        "Cover photo type does not match the uploaded file.",
      );
    }

    const previousCoverId = event.coverImageMediaId;

    await this.prisma.$transaction(async (tx) => {
      let storageDelta = media.originalSizeBytes;

      if (previousCoverId && previousCoverId !== media.id) {
        const previous = await tx.mediaAsset.findUnique({
          where: { id: previousCoverId },
        });
        if (previous) {
          storageDelta -= previous.originalSizeBytes;
          await tx.mediaAsset.update({
            where: { id: previousCoverId },
            data: { deletedAt: new Date() },
          });
        }
      }

      await tx.mediaAsset.update({
        where: { id: media.id },
        data: { status: MediaAssetStatus.ACTIVE },
      });

      await tx.event.update({
        where: { id: event.id },
        data: {
          coverImageMediaId: media.id,
          storageUsedBytes: { increment: storageDelta },
        },
      });
    });

    const updated = await this.findOwnedEvent(eventId, ownerUserId);
    return this.serializeEvent(updated, { includeQrToken: true });
  }

  async getPublicEventBySlug(slug: string) {
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
      include: { coverImage: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return this.serializePublicEvent(event);
  }

  async getPublicEventQr(slug: string) {
    const event = await this.getPublicEventBySlug(slug);
    const eventUrl = this.qrService.getEventPublicUrl(event.slug);
    const qrCodePngBase64 = await this.qrService.generatePngBase64(eventUrl);

    return {
      slug: event.slug,
      title: event.title,
      brideName: event.brideName,
      groomName: event.groomName,
      eventDate: event.eventDate,
      eventUrl,
      qrCodePngBase64,
    };
  }

  private async findOwnedEvent(
    eventId: string,
    ownerUserId: string,
  ): Promise<EventWithCover> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ownerUserId,
        deletedAt: null,
        status: { not: EventStatus.DELETED },
      },
      include: { coverImage: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  /** Slugs are globally unique in DB (including soft-deleted events). */
  private async isSlugTaken(slug: string): Promise<boolean> {
    const existing = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null;
  }

  private async resolveCoverImageUrls(event: EventWithCover) {
    if (!event.coverImage) {
      return {
        coverImageUrl: null as string | null,
        coverImageUrlLan: null as string | null,
        coverImageUrlPublic: null as string | null,
      };
    }

    const urls = await this.storage.getPresignedDownloadUrls({
      key: event.coverImage.originalKey,
    });

    return {
      coverImageUrl: urls.url,
      coverImageUrlLan: urls.lanUrl ?? null,
      coverImageUrlPublic: urls.publicUrl ?? null,
    };
  }

  private async serializePublicEvent(event: EventWithCover) {
    const coverUrls = await this.resolveCoverImageUrls(event);

    const storageUsedPercent = Number(
      (event.storageUsedBytes * BigInt(100)) / event.storageLimitBytes,
    );

    return {
      slug: event.slug,
      title: event.title,
      brideName: event.brideName,
      groomName: event.groomName,
      eventDate: event.eventDate.toISOString().slice(0, 10),
      privacyMode: event.privacyMode,
      showGuestNamesPublicly: event.showGuestNamesPublicly,
      storageUsedBytes: event.storageUsedBytes.toString(),
      storageLimitBytes: event.storageLimitBytes.toString(),
      storageUsedPercent,
      ...coverUrls,
    };
  }

  async serializeEvent(
    event: EventWithCover,
    options: { includeQrToken?: boolean } = {},
  ) {
    const coverUrls = await this.resolveCoverImageUrls(event);
    const publicUrl = this.qrService.getEventPublicUrl(event.slug);

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      brideName: event.brideName,
      groomName: event.groomName,
      eventDate: event.eventDate.toISOString().slice(0, 10),
      status: event.status,
      privacyMode: event.privacyMode,
      showGuestNamesPublicly: event.showGuestNamesPublicly,
      storageUsedBytes: event.storageUsedBytes.toString(),
      storageLimitBytes: event.storageLimitBytes.toString(),
      coverImageMediaId: event.coverImageMediaId,
      ...coverUrls,
      publicUrl,
      ...(options.includeQrToken ? { qrToken: event.qrToken } : {}),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }
}
