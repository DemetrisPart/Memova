import nodemailer from "nodemailer";
import { MediaAssetStatus, MediaAssetType, prisma } from "@momeva/database";
import { logWorkerError } from "@momeva/logging";

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

    const host = process.env.SMTP_HOST ?? "localhost";
    const port = Number.parseInt(process.env.SMTP_PORT ?? "1025", 10);
    const from =
      process.env.SMTP_FROM ?? "Momeva <noreply@momeva.com>";
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
    });

    const text = [
      `Hi — looks like your guests are enjoying Momeva.`,
      "",
      `They've just shared 50 photos full of memories on ${event.title}.`,
      "",
      "Open your gallery anytime to enjoy them — and remember to download your favourites before your gallery expires.",
      "",
      `Your event: /${event.slug}`,
    ].join("\n");

    await transporter.sendMail({
      from,
      to: event.owner.email,
      subject: `50 photos of memories — /${event.slug}`,
      text,
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
