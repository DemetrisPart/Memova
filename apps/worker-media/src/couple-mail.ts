import nodemailer from "nodemailer";

export function utcDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayUtc(): string {
  return utcDateOnly(new Date());
}

/** Add days to a yyyy-mm-dd calendar date (UTC noon anchor). */
export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function sendCoupleEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number.parseInt(process.env.SMTP_PORT ?? "1025", 10);
  const from = process.env.SMTP_FROM ?? "Momeva <noreply@momeva.com>";
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
