/** HTML + text builders for branded couple emails (Mailpit / SMTP). */

export type CoupleEmailContext = {
  eventId: string;
  coupleNames: string;
  eventDateLabel: string;
  galleryUrl: string;
  settingsUrl: string;
  homeUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatCoupleDisplayName(input: {
  groomName?: string | null;
  brideName?: string | null;
  title: string;
}): string {
  const groom = input.groomName?.trim();
  const bride = input.brideName?.trim();
  if (groom && bride) return `${groom} & ${bride}`;
  if (groom) return groom;
  if (bride) return bride;
  return input.title;
}

export function formatEventDateLabel(eventDate: Date): string {
  const iso = eventDate.toISOString().slice(0, 10);
  const date = new Date(`${iso}T12:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function resolveCoupleAppUrls(eventId: string): {
  galleryUrl: string;
  settingsUrl: string;
  homeUrl: string;
} {
  const base = (
    process.env.WEB_APP_URL ??
    process.env.PUBLIC_EVENT_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return {
    galleryUrl: `${base}/dashboard/events/${eventId}/gallery`,
    settingsUrl: `${base}/dashboard/events/${eventId}/settings`,
    homeUrl: `${base}/`,
  };
}

const SHARED_CSS = `
  * { box-sizing: border-box; }
  body{
    margin:0;
    padding:48px 16px;
    background:#FBF7F2;
    font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif;
    color:#2B2622;
  }
  .outer{ max-width:600px; margin:0 auto; }
  .preheader{ display:none; max-height:0; overflow:hidden; }
  .card{
    background:#FFFFFF;
    border:1px solid #E9E1D8;
    border-radius:2px;
  }
  .frame{ margin:14px; border:1px solid #E9E1D8; padding:1px; }
  .hero{
    padding:52px 44px 40px;
    text-align:center;
    border-bottom:1px solid #E9E1D8;
  }
  .wordmark{
    font-family: Georgia, serif;
    font-size:15px;
    letter-spacing:0.14em;
    color:#8C4A4B;
    margin:0 0 34px;
  }
  .divider{
    width:36px;
    height:1px;
    background:#B8935A;
    margin:0 auto 28px;
  }
  .couple{
    font-family: Georgia, 'Times New Roman', serif;
    font-size:28px;
    color:#2B2622;
    margin:0 0 6px;
  }
  .couple-italic{ font-style:italic; }
  .event-date{
    font-family: Helvetica Neue, Arial, sans-serif;
    font-size:13px;
    color:#6B615A;
    letter-spacing:0.03em;
    margin:0;
  }
  .body-copy{
    padding:36px 44px 8px;
    font-family: Helvetica Neue, Arial, sans-serif;
  }
  .greeting{
    font-size:15px;
    color:#2B2622;
    margin:0 0 16px;
    line-height:1.6;
  }
  .message{
    font-size:15px;
    color:#6B615A;
    margin:0 0 20px;
    line-height:1.7;
  }
  .message-tight{ margin-bottom:30px; }
  .cta-row{ text-align:center; padding:4px 44px 44px; }
  .cta-row-tight{ padding-bottom:38px; }
  .cta{
    display:inline-block;
    background:#8C4A4B;
    color:#FBF7F2;
    text-decoration:none;
    font-family: Helvetica Neue, Arial, sans-serif;
    font-size:14px;
    letter-spacing:0.02em;
    padding:15px 38px;
    border-radius:2px;
  }
  .tip{
    margin:0 44px 44px;
    padding:18px 20px;
    background:#F7F0E9;
    border-left:2px solid #B8935A;
    font-family: Helvetica Neue, Arial, sans-serif;
    font-size:13px;
    line-height:1.6;
    color:#6B615A;
  }
  .tip strong{ color:#2B2622; font-weight:600; }
  .footer{
    padding:28px 44px 8px;
    text-align:center;
    font-family: Helvetica Neue, Arial, sans-serif;
  }
  .signoff{
    font-family: Georgia, serif;
    font-style:italic;
    font-size:15px;
    color:#2B2622;
    margin:0 0 26px;
  }
  .footer-meta{
    font-size:11px;
    color:#A79E95;
    line-height:1.8;
    margin:0 0 20px;
  }
  .footer-meta a{ color:#A79E95; text-decoration:underline; }
`;

function shell(opts: {
  title: string;
  preheader: string;
  coupleNames: string;
  coupleItalic?: boolean;
  eventDateLabel: string;
  bodyHtml: string;
  ctaClass?: string;
  tipHtml?: string;
  galleryUrl: string;
  settingsUrl: string;
  homeUrl: string;
}): string {
  const names = escapeHtml(opts.coupleNames);
  const date = escapeHtml(opts.eventDateLabel);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)}</title>
<style>${SHARED_CSS}</style>
</head>
<body>
  <div class="preheader">${escapeHtml(opts.preheader)}</div>
  <div class="outer">
    <div class="card">
      <div class="frame">
        <div class="hero">
          <p class="wordmark">M O M E V A</p>
          <div class="divider"></div>
          <p class="couple${opts.coupleItalic ? " couple-italic" : ""}">${names}</p>
          <p class="event-date">${date}</p>
        </div>
        ${opts.bodyHtml}
        <div class="cta-row${opts.ctaClass ? ` ${opts.ctaClass}` : ""}">
          <a href="${escapeHtml(opts.galleryUrl)}" class="cta">View your gallery</a>
        </div>
        ${opts.tipHtml ?? ""}
        <div class="footer">
          <p class="signoff">With love,<br>The Momeva Team</p>
          <p class="footer-meta">
            You're receiving this because you created a Momeva event.<br>
            <a href="${escapeHtml(opts.settingsUrl)}">Manage notifications</a> &nbsp;·&nbsp; <a href="${escapeHtml(opts.homeUrl)}">Visit Momeva</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildWeddingCountdownEmail(
  ctx: CoupleEmailContext,
): { subject: string; text: string; html: string } {
  const names = ctx.coupleNames;
  const lead = "Tomorrow is your wedding day. Congratulations from Momeva!";
  const subject = `Tomorrow is the day | ${names}`;
  const text = [
    `Hi ${names},`,
    "",
    lead,
    "",
    "Enjoy every moment with your people.",
    "Your guests can share photos throughout the celebration, and you'll be able to revisit them in your gallery anytime you like.",
    "",
    "We'll be here quietly holding your memories, ready whenever you want to look back.",
    "",
    `View your gallery: ${ctx.galleryUrl}`,
    `Manage notifications: ${ctx.settingsUrl}`,
    `Visit Momeva: ${ctx.homeUrl}`,
  ].join("\n");

  const html = shell({
    title: "Momeva — Wedding day countdown",
    preheader: "Congratulations — your wedding is tomorrow.",
    coupleNames: names,
    eventDateLabel: ctx.eventDateLabel,
    galleryUrl: ctx.galleryUrl,
    settingsUrl: ctx.settingsUrl,
    homeUrl: ctx.homeUrl,
    bodyHtml: `
        <div class="body-copy">
          <p class="greeting">Hi ${escapeHtml(names)},</p>
          <p class="message">${escapeHtml(lead)}</p>
          <p class="message">
            Enjoy every moment with your people.<br>
            Your guests can share photos throughout the celebration, and
            you'll be able to revisit them in your gallery anytime you like.
          </p>
          <p class="message message-tight">
            We'll be here quietly holding your memories, ready whenever you
            want to look back.
          </p>
        </div>`,
  });

  return { subject, text, html };
}

export function buildPhotoMilestone50Email(
  ctx: CoupleEmailContext,
): { subject: string; text: string; html: string } {
  const names = ctx.coupleNames;
  const subject = `The first 50 photos | ${names}`;
  const text = [
    `Hi ${names},`,
    "",
    "Your gallery just hit 50 photos full of memories!",
    "Take a look whenever you're ready to relive it.",
    "",
    "Before you go — your gallery is available for a limited time. We recommend downloading your favourite photos so they're always within reach, long after the gallery closes.",
    "",
    `View your gallery: ${ctx.galleryUrl}`,
    `Manage notifications: ${ctx.settingsUrl}`,
    `Visit Momeva: ${ctx.homeUrl}`,
  ].join("\n");

  const html = shell({
    title: "Momeva — New memories notification",
    preheader: `50 new photos were just added to ${names}'s wedding gallery.`,
    coupleNames: names,
    coupleItalic: true,
    eventDateLabel: ctx.eventDateLabel,
    galleryUrl: ctx.galleryUrl,
    settingsUrl: ctx.settingsUrl,
    homeUrl: ctx.homeUrl,
    ctaClass: "cta-row-tight",
    tipHtml: `
        <div class="tip">
          <strong>Before you go —</strong> your gallery is available for a limited time.
          We recommend downloading your favourite photos so they're always within reach,
          long after the gallery closes.
        </div>`,
    bodyHtml: `
        <div class="body-copy">
          <p class="greeting">Hi ${escapeHtml(names)},</p>
          <p class="message message-tight">
            Your gallery just hit 50 photos full of memories!<br>
            Take a look whenever you're ready to relive it.
          </p>
        </div>`,
  });

  return { subject, text, html };
}
