import { Injectable } from "@nestjs/common";
import {
  MediaAssetStatus,
  UserRole,
} from "@momeva/database";
import { EmailService } from "../auth/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { MediaQueueService } from "../queue/media-queue.service";

export type AdminFailureItem = {
  source: "media" | "queue";
  id: string;
  mediaId: string | null;
  eventId: string | null;
  eventSlug: string | null;
  reason: string;
  status: string;
  failedAt: string;
};

export type AdminStorageFullItem = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  storageUsedBytes: string;
  storageLimitBytes: string;
  notifiedAt: string | null;
};

function formatBytesLabel(bytes: bigint): string {
  const gb = Number(bytes) / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = Number(bytes) / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${bytes.toString()} B`;
}

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaQueue: MediaQueueService,
    private readonly email: EmailService,
  ) {}

  async listRecentFailures(limit = 20): Promise<{
    items: AdminFailureItem[];
    queueFailedCount: number;
  }> {
    const take = Math.min(Math.max(limit, 1), 50);

    const [failedMedia, queueFailed, queueCounts] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where: {
          deletedAt: null,
          OR: [
            { status: MediaAssetStatus.FAILED },
            {
              status: MediaAssetStatus.QUARANTINED,
              failureReason: { not: null },
            },
          ],
        },
        include: {
          event: { select: { id: true, slug: true } },
        },
        orderBy: { updatedAt: "desc" },
        take,
      }),
      this.mediaQueue.getRecentFailedJobs(take),
      this.mediaQueue.getCounts(),
    ]);

    const mediaItems: AdminFailureItem[] = failedMedia.map((media) => ({
      source: "media",
      id: media.id,
      mediaId: media.id,
      eventId: media.event.id,
      eventSlug: media.event.slug,
      reason: media.failureReason ?? media.status,
      status: media.status,
      failedAt: media.updatedAt.toISOString(),
    }));

    const queueItems: AdminFailureItem[] = [];
    for (const job of queueFailed) {
      let eventSlug = job.eventSlug;
      if (!eventSlug && job.eventId) {
        const event = await this.prisma.event.findFirst({
          where: { id: job.eventId },
          select: { slug: true },
        });
        eventSlug = event?.slug ?? null;
      }
      queueItems.push({
        source: "queue",
        id: job.id,
        mediaId: job.mediaId,
        eventId: job.eventId,
        eventSlug,
        reason: job.reason,
        status: "QUEUE_FAILED",
        failedAt: job.failedAt,
      });
    }

    const merged = [...mediaItems, ...queueItems].sort((a, b) =>
      a.failedAt < b.failedAt ? 1 : -1,
    );

    return {
      items: merged.slice(0, take),
      queueFailedCount: queueCounts.failed,
    };
  }

  async listStorageFull(limit = 20): Promise<{ items: AdminStorageFullItem[] }> {
    const take = Math.min(Math.max(limit, 1), 50);
    const events = await this.prisma.event.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
        storageFullNotifiedAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const full = events
      .filter((event) => event.storageUsedBytes >= event.storageLimitBytes)
      .slice(0, take)
      .map((event) => ({
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        storageUsedBytes: event.storageUsedBytes.toString(),
        storageLimitBytes: event.storageLimitBytes.toString(),
        notifiedAt: event.storageFullNotifiedAt?.toISOString() ?? null,
      }));

    return { items: full };
  }

  /**
   * Email + mark notified once per "full" episode.
   * Cleared when admin extends storageLimitBytes.
   */
  async notifyStorageFull(eventId: string): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
        storageFullNotifiedAt: true,
      },
    });
    if (!event) return;
    if (event.storageUsedBytes < event.storageLimitBytes) return;
    if (event.storageFullNotifiedAt) return;

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.PLATFORM_ADMIN, deletedAt: null },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const now = new Date();
    await this.prisma.event.update({
      where: { id: event.id },
      data: { storageFullNotifiedAt: now },
    });

    await this.email.sendAdminStorageFullAlert({
      to: admins.map((admin) => admin.email),
      eventSlug: event.slug,
      eventTitle: event.title,
      storageUsedLabel: formatBytesLabel(event.storageUsedBytes),
      storageLimitLabel: formatBytesLabel(event.storageLimitBytes),
    });
  }

  async notifyAdminsOfUploadFailure(input: {
    eventId: string;
    mediaId: string;
    reason: string;
  }): Promise<void> {
    const [event, admins] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: input.eventId, deletedAt: null },
        select: { slug: true },
      }),
      this.prisma.user.findMany({
        where: {
          role: UserRole.PLATFORM_ADMIN,
          deletedAt: null,
        },
        select: { email: true },
      }),
    ]);

    if (!event || admins.length === 0) return;

    await this.email.sendAdminUploadFailureAlert({
      to: admins.map((admin) => admin.email),
      eventSlug: event.slug,
      mediaId: input.mediaId,
      reason: input.reason,
    });
  }
}
