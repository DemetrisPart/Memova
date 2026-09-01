import { MediaAssetStatus, MediaAssetType, prisma } from "@momeva/database";
import { logWorkerError } from "@momeva/logging";
import {
  buildPhotoMilestone50Email,
  formatCoupleDisplayName,
  formatEventDateLabel,
  resolveCoupleAppUrls,
} from "./couple-email-templates";
import { sendCoupleEmail } from "./couple-mail";

const PHOTO_MILESTONE_50 = 50;

/**
 * Mandatory (not a couple setting): email the event owner once when
 * ACTIVE photo count first reaches 50.
 */
export async function maybeNotifyCouplePhotoMilestone50(
  eventId: string,
): Promise<void> {
  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        brideName: true,
        groomName: true,
        eventDate: true,
        photoMilestone50NotifiedAt: true,
        owner: { select: { email: true } },
      },
    });
    if (!event || event.photoMilestone50NotifiedAt) return;

    const photoCount = await prisma.mediaAsset.count({
      where: {
        eventId,
        deletedAt: null,
        type: MediaAssetType.PHOTO,
        status: MediaAssetStatus.ACTIVE,
      },
    });
    if (photoCount < PHOTO_MILESTONE_50) return;

    const claimed = await prisma.event.updateMany({
      where: {
        id: eventId,
        photoMilestone50NotifiedAt: null,
      },
      data: { photoMilestone50NotifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const coupleNames = formatCoupleDisplayName(event);
    const urls = resolveCoupleAppUrls(event.id);
    const mail = buildPhotoMilestone50Email({
      eventId: event.id,
      coupleNames,
      eventDateLabel: formatEventDateLabel(event.eventDate),
      ...urls,
    });

    await sendCoupleEmail({
      to: event.owner.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    logWorkerError({
      jobId: eventId,
      queue: "media",
      message: "Failed to email couple about 50-photo milestone",
      err,
    });
  }
}
