import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const host = this.config.get<string>("SMTP_HOST", "localhost");
      const port = this.config.get<number>("SMTP_PORT", 1025);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
      });
    }
    return this.transporter;
  }

  async sendMagicLink(
    email: string,
    approveUrl: string,
    options?: { ttlMinutes?: number },
  ): Promise<void> {
    const ttlMinutes = options?.ttlMinutes ?? 15;
    const from = this.config.get<string>(
      "SMTP_FROM",
      "Momeva <noreply@momeva.com>",
    );
    const text = [
      "Sign in to Momeva",
      "",
      "Tap Approve in your browser to confirm this sign-in request:",
      approveUrl,
      "",
      `This request expires in ${ttlMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n");

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Sign in to Momeva</h1>
        <p style="color: #57534e; line-height: 1.5;">
          Tap the button below to approve sign-in. Your Momeva tab will continue automatically.
        </p>
        <p style="margin: 28px 0;">
          <a href="${approveUrl}" style="display: inline-block; background: #a16207; color: #fffaf5; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600;">
            Approve sign in
          </a>
        </p>
        <p style="color: #78716c; font-size: 13px; line-height: 1.5;">
          This request expires in ${ttlMinutes} minutes. If you did not request this, ignore this email.
        </p>
      </div>
    `;

    try {
      await this.getTransporter().sendMail({
        from,
        to: email,
        subject: "Approve sign in to Momeva",
        text,
        html,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to send magic link email",
        { cause: error },
      );
    }
  }

  /** Best-effort alert to platform admins (does not throw on SMTP failure). */
  async sendAdminUploadFailureAlert(input: {
    to: string[];
    eventSlug: string;
    mediaId: string;
    reason: string;
  }): Promise<void> {
    if (input.to.length === 0) return;

    const from = this.config.get<string>(
      "SMTP_FROM",
      "Momeva <noreply@momeva.com>",
    );
    const subject = `Momeva upload failed — /${input.eventSlug}`;
    const text = [
      "A media upload failed permanently.",
      "",
      `Event: /${input.eventSlug}`,
      `Media ID: ${input.mediaId}`,
      `Reason: ${input.reason}`,
      "",
      "Open /admin for system health and recent failures.",
    ].join("\n");

    try {
      await this.getTransporter().sendMail({
        from,
        to: input.to.join(", "),
        subject,
        text,
      });
    } catch {
      // Do not fail the upload/verify path if mail is down.
    }
  }
}
