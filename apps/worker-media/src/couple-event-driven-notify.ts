import { MediaAssetStatus, MediaAssetType, prisma } from "@momeva/database";
import { logWorkerError } from "@momeva/logging";
import { sendCoupleEmail } from "./couple-mail";

const STORAGE_NEAR_FULL_RATIO = 0.8;

/** Optional pref: first ACTIVE guest photo on the event. */
export async function maybeNotifyCoupleFirstGuestPhoto(
  eventId: string,
): Promise<void> {
  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        notifyFirstGuestPhoto: true,
        firstGuestPhotoNotifiedAt: true,
        owner: { select: { email: true } },
      },
    });
    if (
      !event ||
      !event.notifyFirstGuestPhoto ||
      event.firstGuestPhotoNotifiedAt
    ) {
      return;
    }

    const photoCount = await prisma.mediaAsset.count({
      where: {
        eventId,
        deletedAt: null,
        type: MediaAssetType.PHOTO,
        status: MediaAssetStatus.ACTIVE,
      },
    });
    if (photoCount !== 1) return;

    const claimed = await prisma.event.updateMany({
      where: {
        id: eventId,
        firstGuestPhotoNotifiedAt: null,
        notifyFirstGuestPhoto: true,
      },
      data: { firstGuestPhotoNotifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const text = [
      "Hi — your first guest photo just arrived on Momeva.",
      "",
      `Someone shared a photo for ${event.title}.`,
      "",
      "Open your gallery anytime to enjoy it.",
      "",
      `Your event: /${event.slug}`,
    ].join("\n");

    await sendCoupleEmail({
      to: event.owner.email,
      subject: `First guest photo — /${event.slug}`,
      text,
    });
  } catch (err) {
    logWorkerError({
      jobId: eventId,
      queue: "media",
      message: "Failed to email couple about first guest photo",
      err,
    });
  }
}

/** Optional pref: storage used reaches 80%+ of limit (once until admin extends). */
export async function maybeNotifyCoupleStorageNearFull(
  eventId: string,
): Promise<void> {
  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        notifyStorageNearFull: true,
        storageNearFullNotifiedAt: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
        owner: { select: { email: true } },
      },
    });
    if (
      !event ||
      !event.notifyStorageNearFull ||
      event.storageNearFullNotifiedAt ||
      event.storageLimitBytes <= BigInt(0)
    ) {
      return;
    }

    const used = Number(event.storageUsedBytes);
    const limit = Number(event.storageLimitBytes);
    if (used / limit < STORAGE_NEAR_FULL_RATIO) return;

    const claimed = await prisma.event.updateMany({
      where: {
        id: eventId,
        storageNearFullNotifiedAt: null,
        notifyStorageNearFull: true,
      },
      data: { storageNearFullNotifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const pct = Math.min(100, Math.floor((used / limit) * 100));
    const text = [
      `Your Momeva gallery is nearly full (${pct}% used) for ${event.title}.`,
      "",
      "Guest uploads may start failing soon if space runs out.",
      "Open your dashboard to review storage, or ask support to extend it.",
      "",
      `Your event: /${event.slug}`,
    ].join("\n");

    await sendCoupleEmail({
      to: event.owner.email,
      subject: `Storage nearly full — /${event.slug}`,
      text,
    });
  } catch (err) {
    logWorkerError({
      jobId: eventId,
      queue: "media",
      message: "Failed to email couple about storage near full",
      err,
    });
  }
}
