import { prisma } from "@momeva/database";
import { getLogger, logWorkerError } from "@momeva/logging";
import {
  buildWeddingCountdownEmail,
  formatCoupleDisplayName,
  formatEventDateLabel,
  resolveCoupleAppUrls,
} from "./couple-email-templates";
import { addDaysIso, sendCoupleEmail, todayUtc, utcDateOnly } from "./couple-mail";

const logger = getLogger().child({ service: "worker-media", job: "couple-scheduler" });

/**
 * Timed couple emails:
 * - Wedding countdown (mandatory): only the calendar day before eventDate
 * - Gallery expiry 3d (pref): 3 days before galleryVisibleDays end (catch-up until end)
 */
export async function runCoupleScheduledEmails(): Promise<void> {
  const today = todayUtc();

  try {
    await sendWeddingCountdowns(today);
    await sendExpiryReminders(today);
  } catch (err) {
    logWorkerError({
      jobId: "couple-scheduler",
      queue: "scheduler",
      message: "Couple scheduled email tick failed",
      err,
    });
  }
}

async function sendWeddingCountdowns(today: string): Promise<void> {
  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      weddingCountdownNotifiedAt: null,
      notifyWeddingCountdown: true,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      brideName: true,
      groomName: true,
      eventDate: true,
      owner: { select: { email: true } },
    },
    take: 200,
  });

  for (const event of events) {
    const eventDay = utcDateOnly(event.eventDate);
    const dayBefore = addDaysIso(eventDay, -1);
    // Only the day before the wedding — never on the wedding day itself.
    if (today !== dayBefore) continue;

    const claimed = await prisma.event.updateMany({
      where: { id: event.id, weddingCountdownNotifiedAt: null },
      data: { weddingCountdownNotifiedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const coupleNames = formatCoupleDisplayName(event);
    const urls = resolveCoupleAppUrls(event.id);
    const mail = buildWeddingCountdownEmail({
      eventId: event.id,
      coupleNames,
      eventDateLabel: formatEventDateLabel(event.eventDate),
      ...urls,
    });

    try {
      await sendCoupleEmail({
        to: event.owner.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      logger.info({ eventId: event.id, slug: event.slug }, "Wedding countdown email sent");
    } catch (err) {
      await prisma.event.update({
        where: { id: event.id },
        data: { weddingCountdownNotifiedAt: null },
      });
      logWorkerError({
        jobId: event.id,
        queue: "scheduler",
        message: "Failed to send wedding countdown email",
        err,
      });
    }
  }
}

async function sendExpiryReminders(today: string): Promise<void> {
  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      notifyExpiry3d: true,
      expiry3dNotifiedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      eventDate: true,
      galleryVisibleDays: true,
      owner: { select: { email: true } },
    },
    take: 200,
  });

  for (const event of events) {
    const eventDay = utcDateOnly(event.eventDate);
    const endDay = addDaysIso(eventDay, event.galleryVisibleDays);
    const remindDay = addDaysIso(endDay, -3);
    // Catch-up window: from remind day until (but not after) gallery end day.
    if (today < remindDay || today > endDay) continue;

    const claimed = await prisma.event.updateMany({
      where: {
        id: event.id,
        expiry3dNotifiedAt: null,
        notifyExpiry3d: true,
      },
      data: { expiry3dNotifiedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const text = [
      `Your Momeva gallery for ${event.title} expires soon.`,
      "",
      "Please download your pictures before they are deleted from Momeva.",
      "",
      `Your event: /${event.slug}`,
    ].join("\n");

    try {
      await sendCoupleEmail({
        to: event.owner.email,
        subject: `Gallery expires soon — /${event.slug}`,
        text,
      });
      logger.info({ eventId: event.id, slug: event.slug }, "Expiry reminder email sent");
    } catch (err) {
      await prisma.event.update({
        where: { id: event.id },
        data: { expiry3dNotifiedAt: null },
      });
      logWorkerError({
        jobId: event.id,
        queue: "scheduler",
        message: "Failed to send gallery expiry reminder",
        err,
      });
    }
  }
}

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

/** Periodic tick + immediate run on start. Returns clear handle. */
export function startCoupleEmailScheduler(
  intervalMs = DEFAULT_INTERVAL_MS,
): NodeJS.Timeout {
  void runCoupleScheduledEmails();
  return setInterval(() => {
    void runCoupleScheduledEmails();
  }, intervalMs);
}
