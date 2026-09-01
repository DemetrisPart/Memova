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
