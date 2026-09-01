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
  UploadBatchStatus,
  UserRole,
} from "@momeva/database";
import {
  MIME_SNIFF_BYTE_LENGTH,
  STORAGE_SERVICE,
  buildMediaOriginalKey,
  checkStorageQuota,
  detectMimeFromBuffer,
  extensionFromMimeType,
  isAllowedPhotoMimeType,
  isMediaOriginalKeyForEvent,
  mimeMatchesDeclared,
  normalizeEventSlug,
  validateEventSlug,
  type StorageService,
} from "@momeva/domain";
import { logUploadComplete, logUploadError, logUploadFailed, logUploadInit, logStorageUsage } from "@momeva/logging";
import { MVP_DEFAULTS } from "@momeva/shared";
import { MediaQueueService } from "../queue/media-queue.service";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import type { GuestSessionContext } from "../public/guest-session.guard";
import type { UploadCompleteDto, UploadInitDto } from "./dto/upload.dto";
@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mediaQueue: MediaQueueService,
    private readonly rateLimit: RateLimitService,
    private readonly email: EmailService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async initUpload(
    slug: string,
    guestSession: GuestSessionContext,
    dto: UploadInitDto,
  ) {
    const event = await this.findActiveEventBySlug(slug);

    if (guestSession.eventId !== event.id) {
      throw new NotFoundException("Event not found");
    }

    await this.rateLimit.assertUploadInitLimit(guestSession.id);

    if (dto.files.length > MVP_DEFAULTS.MAX_PHOTOS_PER_BATCH) {
      throw new BadRequestException(
        `Maximum ${MVP_DEFAULTS.MAX_PHOTOS_PER_BATCH} photos per upload batch`,
      );
    }

    await this.assertGuestHourlyLimit(guestSession.id, dto.files.length);

    let incomingBytes = BigInt(0);
    for (const file of dto.files) {
      if (!isAllowedPhotoMimeType(file.contentType)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.contentType}`,
        );
      }
      if (file.contentLength > MVP_DEFAULTS.MAX_PHOTO_SIZE_BYTES) {
        throw new BadRequestException(
          `File exceeds maximum size of ${MVP_DEFAULTS.MAX_PHOTO_SIZE_BYTES} bytes`,
        );
      }
      incomingBytes += BigInt(file.contentLength);
    }

    const quota = checkStorageQuota({
      storageUsedBytes: event.storageUsedBytes,
      storageLimitBytes: event.storageLimitBytes,
      incomingBytes,
    });

    if (!quota.allowed) {
      throw new ConflictException("Event storage limit reached");
    }

    const env = this.config.get<string>("APP_ENV", "development");
    const batch = await this.prisma.uploadBatch.create({
      data: {
        eventId: event.id,
        guestSessionId: guestSession.id,
        uploadSessionId: dto.uploadSessionId,
        status: UploadBatchStatus.UPLOADING,
      },
    });

    const items = await Promise.all(
      dto.files.map(async (file) => {
        const mediaId = randomUUID();
        const extension = extensionFromMimeType(file.contentType);
        const storageKey = buildMediaOriginalKey(
          env,
          event.id,
          mediaId,
          extension,
        );

        if (!isMediaOriginalKeyForEvent(storageKey, env, event.id)) {
          throw new BadRequestException("Invalid storage path for event");
        }

        const media = await this.prisma.mediaAsset.create({
          data: {
            id: mediaId,
            eventId: event.id,
            guestSessionId: guestSession.id,
            uploadBatchId: batch.id,
            type: MediaAssetType.PHOTO,
            status: MediaAssetStatus.PENDING,
            originalKey: storageKey,
            originalSizeBytes: BigInt(file.contentLength),
            mimeType: file.contentType,
          },
        });

        const presigned = await this.storage.getPresignedUploadUrl({
          key: storageKey,
          contentType: file.contentType,
          contentLength: file.contentLength,
        });

        return {
          mediaId: media.id,
          clientFileId: file.clientFileId,
          uploadUrl: presigned.url,
          uploadUrlLan: presigned.lanUrl ?? null,
          uploadUrlPublic: presigned.publicUrl ?? null,
          expiresAt: presigned.expiresAt.toISOString(),
        };
      }),
    );

    logUploadInit({
      eventId: event.id,
      guestSessionId: guestSession.id,
      uploadSessionId: dto.uploadSessionId,
      fileCount: dto.files.length,
    });

    return {
      batchId: batch.id,
      uploadSessionId: dto.uploadSessionId,
      items,
    };
  }

  async completeUpload(
    slug: string,
    batchId: string,
    guestSession: GuestSessionContext,
    dto: UploadCompleteDto,
  ) {
    const event = await this.findActiveEventBySlug(slug);

    if (guestSession.eventId !== event.id) {
      throw new NotFoundException("Event not found");
    }

    await this.rateLimit.assertUploadCompleteLimit(guestSession.id);

    const batch = await this.prisma.uploadBatch.findFirst({
      where: {
        id: batchId,
        eventId: event.id,
        guestSessionId: guestSession.id,
        deletedAt: null,
      },
    });

    if (!batch) {
      throw new NotFoundException("Upload batch not found");
    }

    if (
      batch.status === UploadBatchStatus.COMPLETED ||
      batch.status === UploadBatchStatus.PARTIAL
    ) {
      throw new BadRequestException("Upload batch already completed");
    }

    const mediaFilter = {
      eventId: event.id,
      uploadBatchId: batch.id,
      guestSessionId: guestSession.id,
      deletedAt: null,
      status: MediaAssetStatus.PENDING,
      ...(dto.mediaIds?.length ? { id: { in: dto.mediaIds } } : {}),
    };

    const pendingMedia = await this.prisma.mediaAsset.findMany({
      where: mediaFilter,
    });

    if (pendingMedia.length === 0) {
      throw new BadRequestException("No pending uploads in this batch");
    }

    const verified: typeof pendingMedia = [];
    const failed: { mediaId: string; reason: string }[] = [];

    const env = this.config.get<string>("APP_ENV", "development");

    for (const media of pendingMedia) {
      try {
        if (!isMediaOriginalKeyForEvent(media.originalKey, env, event.id)) {
          failed.push({ mediaId: media.id, reason: "INVALID_STORAGE_KEY" });
          continue;
        }

        const exists = await this.storage.objectExists(media.originalKey);
        if (!exists) {
          failed.push({ mediaId: media.id, reason: "UPLOAD_MISSING" });
          continue;
        }

        const sniffBuffer = await this.storage.getObjectBuffer({
          key: media.originalKey,
          maxBytes: MIME_SNIFF_BYTE_LENGTH,
        });
        const detected = detectMimeFromBuffer(sniffBuffer);

        if (!mimeMatchesDeclared(detected, media.mimeType)) {
          failed.push({ mediaId: media.id, reason: "MIME_MISMATCH" });
          logUploadError({
            eventId: event.id,
            uploadSessionId: batch.uploadSessionId,
            errorCode: "MIME_MISMATCH",
            message: "Declared MIME type does not match file content",
          });
          continue;
        }

        verified.push(media);
      } catch (err) {
        failed.push({ mediaId: media.id, reason: "VERIFY_FAILED" });
        logUploadError({
          eventId: event.id,
          uploadSessionId: batch.uploadSessionId,
          errorCode: "VERIFY_FAILED",
          message: "Failed to verify uploaded object",
          err,
        });
      }
    }

    if (verified.length === 0) {
      await this.prisma.$transaction([
        ...failed.map((item) =>
          this.prisma.mediaAsset.update({
            where: { id: item.mediaId },
            data: {
              status: MediaAssetStatus.QUARANTINED,
              failureReason: item.reason.slice(0, 500),
            },
          }),
        ),
        this.prisma.uploadBatch.update({
          where: { id: batch.id },
          data: { status: UploadBatchStatus.FAILED },
        }),
      ]);

      logUploadFailed({
        eventId: event.id,
        batchId: batch.id,
        reason: "ALL_VERIFY_FAILED",
      });

      void this.notifyAdminsOfFailures(
        event.slug,
        failed.map((item) => ({
          mediaId: item.mediaId,
          reason: item.reason,
        })),
      );

      throw new BadRequestException("No uploads could be verified");
    }

    const incomingBytes = verified.reduce(
      (sum, media) => sum + media.originalSizeBytes,
      BigInt(0),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${event.id}::uuid FOR UPDATE`;

      const lockedEvent = await tx.event.findUniqueOrThrow({
        where: { id: event.id },
      });

      const quota = checkStorageQuota({
        storageUsedBytes: lockedEvent.storageUsedBytes,
        storageLimitBytes: lockedEvent.storageLimitBytes,
        incomingBytes,
      });

      if (!quota.allowed) {
        throw new ConflictException("Event storage limit reached");
      }

      for (const item of failed) {
        await tx.mediaAsset.update({
          where: { id: item.mediaId },
          data: {
            status: MediaAssetStatus.QUARANTINED,
            failureReason: item.reason.slice(0, 500),
          },
        });
      }

      for (const media of verified) {
        await tx.mediaAsset.update({
          where: { id: media.id },
          data: { status: MediaAssetStatus.PROCESSING },
        });
      }

      await tx.event.update({
        where: { id: event.id },
        data: { storageUsedBytes: { increment: incomingBytes } },
      });

      const batchStatus =
        failed.length === 0
          ? UploadBatchStatus.COMPLETED
          : UploadBatchStatus.PARTIAL;

      await tx.uploadBatch.update({
        where: { id: batch.id },
        data: { status: batchStatus },
      });
    });

    const updatedEvent = await this.prisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });

    logStorageUsage({
      eventId: event.id,
      storageUsedBytes: updatedEvent.storageUsedBytes.toString(),
      storageLimitBytes: updatedEvent.storageLimitBytes.toString(),
      storageUsedPercent: Number(
        (updatedEvent.storageUsedBytes * BigInt(100)) /
          updatedEvent.storageLimitBytes,
      ),
    });

    await Promise.all(
      verified.map((media) =>
        this.mediaQueue.enqueueImageProcessing({
          mediaAssetId: media.id,
          eventId: event.id,
        }),
      ),
    );

    logUploadComplete({
      eventId: event.id,
      guestSessionId: guestSession.id,
      batchId: batch.id,
      queuedCount: verified.length,
      failedCount: failed.length,
    });

    if (failed.length > 0) {
      void this.notifyAdminsOfFailures(
        event.slug,
        failed.map((item) => ({
          mediaId: item.mediaId,
          reason: item.reason,
        })),
      );
    }

    return {
      batchId: batch.id,
      status: failed.length === 0 ? "COMPLETED" : "PARTIAL",
      queuedCount: verified.length,
      failedCount: failed.length,
      failed,
    };
  }

  private async notifyAdminsOfFailures(
    eventSlug: string,
    failures: Array<{ mediaId: string; reason: string }>,
  ): Promise<void> {
    if (failures.length === 0) return;
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.PLATFORM_ADMIN, deletedAt: null },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const emails = admins.map((admin) => admin.email);
    await Promise.all(
      failures.map((failure) =>
        this.email.sendAdminUploadFailureAlert({
          to: emails,
          eventSlug,
          mediaId: failure.mediaId,
          reason: failure.reason,
        }),
      ),
    );
  }

  private async assertGuestHourlyLimit(
    guestSessionId: string,
    incomingFileCount: number,
  ): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const pendingCutoff = new Date(
      Date.now() - MVP_DEFAULTS.PRESIGNED_UPLOAD_TTL_SECONDS * 1000,
    );

    // Count successful + in-flight uploads only — not abandoned PENDING rows from failed tests.
    const count = await this.prisma.mediaAsset.count({
      where: {
        guestSessionId,
        deletedAt: null,
        createdAt: { gte: since },
        OR: [
          {
            status: {
              in: [MediaAssetStatus.ACTIVE, MediaAssetStatus.PROCESSING],
            },
          },
          {
            status: MediaAssetStatus.PENDING,
            createdAt: { gte: pendingCutoff },
          },
        ],
      },
    });

    if (
      count + incomingFileCount >
      MVP_DEFAULTS.MAX_PHOTOS_PER_GUEST_SESSION_HOUR
    ) {
      throw new ConflictException(
        `Upload limit reached (${MVP_DEFAULTS.MAX_PHOTOS_PER_GUEST_SESSION_HOUR} photos per hour). Please try again later.`,
      );
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
