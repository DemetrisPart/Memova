/**
 * One-off local check: send both branded couple emails to Mailpit.
 * Usage: pnpm --filter @momeva/worker-media exec tsx src/verify-couple-emails.ts
 */
import "./load-env";
import { prisma } from "@momeva/database";
import {
  buildPhotoMilestone50Email,
  buildWeddingCountdownEmail,
  formatCoupleDisplayName,
  formatEventDateLabel,
  resolveCoupleAppUrls,
} from "./couple-email-templates";
import { sendCoupleEmail } from "./couple-mail";

async function main() {
  const event = await prisma.event.findFirst({
    where: { slug: "wedding-3-oct-2026", deletedAt: null },
    select: {
      id: true,
      title: true,
      brideName: true,
      groomName: true,
      eventDate: true,
      owner: { select: { email: true } },
    },
  });
  if (!event) {
    throw new Error("Test event wedding-3-oct-2026 not found");
  }

  const coupleNames = formatCoupleDisplayName(event);
  const urls = resolveCoupleAppUrls(event.id);
  const ctx = {
    eventId: event.id,
    coupleNames,
    eventDateLabel: formatEventDateLabel(event.eventDate),
    ...urls,
  };

  const fifty = buildPhotoMilestone50Email(ctx);
  const wedding = buildWeddingCountdownEmail(ctx);

  await sendCoupleEmail({
    to: event.owner.email,
    subject: fifty.subject,
    text: fifty.text,
    html: fifty.html,
  });
  await sendCoupleEmail({
    to: event.owner.email,
    subject: wedding.subject,
    text: wedding.text,
    html: wedding.html,
  });

  console.log(
    JSON.stringify({
      ok: true,
      to: event.owner.email,
      subjects: [fifty.subject, wedding.subject],
      galleryUrl: urls.galleryUrl,
      settingsUrl: urls.settingsUrl,
      homeUrl: urls.homeUrl,
    }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
