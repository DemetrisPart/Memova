import nodemailer from "nodemailer";
import {
  MediaAssetStatus,
  UserRole,
  prisma,
} from "@momeva/database";
import { logWorkerError } from "@momeva/logging";

export async function markMediaFailed(
  mediaAssetId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim().slice(0, 500) || "PROCESSING_FAILED";
  await prisma.mediaAsset.updateMany({
    where: {
      id: mediaAssetId,
      status: MediaAssetStatus.PROCESSING,
    },
    data: {
      status: MediaAssetStatus.FAILED,
      failureReason: trimmed,
    },
  });
}

export async function notifyAdminsOfProcessingFailure(input: {
  eventId: string;
  mediaId: string;
  reason: string;
}): Promise<void> {
  try {
    const [event, admins] = await Promise.all([
      prisma.event.findFirst({
        where: { id: input.eventId, deletedAt: null },
        select: { slug: true },
      }),
      prisma.user.findMany({
        where: { role: UserRole.PLATFORM_ADMIN, deletedAt: null },
        select: { email: true },
      }),
    ]);

    if (!event || admins.length === 0) return;

    const host = process.env.SMTP_HOST ?? "localhost";
    const port = Number.parseInt(process.env.SMTP_PORT ?? "1025", 10);
    const from =
      process.env.SMTP_FROM ?? "Momeva <noreply@momeva.com>";
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
    });

    await transporter.sendMail({
      from,
      to: admins.map((admin) => admin.email).join(", "),
      subject: `Momeva upload failed — /${event.slug}`,
      text: [
        "A media processing job failed permanently.",
        "",
        `Event: /${event.slug}`,
        `Media ID: ${input.mediaId}`,
        `Reason: ${input.reason}`,
        "",
        "Open /admin for system health and recent failures.",
      ].join("\n"),
    });
  } catch (err) {
    logWorkerError({
      jobId: input.mediaId,
      queue: "media",
      mediaId: input.mediaId,
      message: "Failed to email admins about processing failure",
      err,
    });
  }
}
