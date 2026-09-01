import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MediaAssetStatus, MediaAssetType } from "@momeva/database";
import { ADMIN_ENTITLEMENTS, gbToBytes } from "@momeva/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { GalleryService } from "../gallery/gallery.service";
import type { AdminUpdateEventEntitlementsDto } from "./dto/admin-update-event-entitlements.dto";

@Injectable()
export class AdminEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly galleryService: GalleryService,
  ) {}

  async listEvents(options: { date?: string } = {}) {
    const where: {
      deletedAt: null;
      eventDate?: { gte: Date; lt: Date };
    } = { deletedAt: null };

    if (options.date) {
      const day = new Date(`${options.date}T00:00:00.000Z`);
      if (Number.isNaN(day.getTime())) {
        throw new BadRequestException("Invalid date");
      }
      const next = new Date(day);
      next.setUTCDate(next.getUTCDate() + 1);
      where.eventDate = { gte: day, lt: next };
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        owner: { select: { id: true, email: true, role: true } },
        coverImage: true,
        _count: {
          select: {
            mediaAssets: {
              where: {
                deletedAt: null,
                status: MediaAssetStatus.ACTIVE,
                type: MediaAssetType.PHOTO,
              },
            },
          },
        },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    return Promise.all(
      events.map(async (event) => {
        const serialized = await this.eventsService.serializeEvent(event);
        return {
          ...serialized,
          ownerEmail: event.owner.email,
          ownerId: event.owner.id,
          photoCount: event._count.mediaAssets,
        };
      }),
    );
  }

  async getEvent(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      include: {
        owner: { select: { id: true, email: true, role: true } },
        coverImage: true,
      },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const [serialized, photoCount, videoCount] = await Promise.all([
      this.eventsService.serializeEvent(event, { includeQrToken: true }),
      this.prisma.mediaAsset.count({
        where: {
          eventId,
          deletedAt: null,
          status: MediaAssetStatus.ACTIVE,
          type: MediaAssetType.PHOTO,
        },
      }),
      this.prisma.mediaAsset.count({
        where: {
          eventId,
          deletedAt: null,
          status: MediaAssetStatus.ACTIVE,
          type: MediaAssetType.VIDEO,
        },
      }),
    ]);

    return {
      ...serialized,
      ownerEmail: event.owner.email,
      ownerId: event.owner.id,
      photoCount,
      videoCount,
    };
  }

  async updateEntitlements(
    eventId: string,
    dto: AdminUpdateEventEntitlementsDto,
  ) {
    if (
      dto.galleryVisibleDays === undefined &&
      dto.storageLimitGb === undefined
    ) {
      throw new BadRequestException("No entitlement changes provided");
    }

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const data: {
      galleryVisibleDays?: number;
      storageLimitBytes?: bigint;
      storageFullNotifiedAt?: Date | null;
    } = {};

    if (dto.galleryVisibleDays !== undefined) {
      data.galleryVisibleDays = dto.galleryVisibleDays;
    }

    if (dto.storageLimitGb !== undefined) {
      const nextBytes = gbToBytes(dto.storageLimitGb);
      if (nextBytes < event.storageUsedBytes) {
        throw new BadRequestException(
          "Storage limit cannot be below storage already used",
        );
      }
      if (dto.storageLimitGb > ADMIN_ENTITLEMENTS.STORAGE_GB_MAX) {
        throw new BadRequestException(
          `Storage limit cannot exceed ${ADMIN_ENTITLEMENTS.STORAGE_GB_MAX} GB`,
        );
      }
      data.storageLimitBytes = nextBytes;
      // Allow a fresh alert the next time this event fills again.
      data.storageFullNotifiedAt = null;
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data,
    });

    return this.getEvent(eventId);
  }

  listGallery(eventId: string, query: { cursor?: string; limit?: number }) {
    return this.galleryService.listCoupleGallery(eventId, query);
  }

  getMediaUrl(
    eventId: string,
    mediaId: string,
    variant: "thumb" | "web" | "original" = "web",
  ) {
    return this.galleryService.getCoupleMediaUrl(eventId, mediaId, variant);
  }
}
