import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthTokens } from "@momeva/domain";
import { PrismaService } from "../prisma/prisma.service";
import {
  addDays,
  addMinutes,
  generateSecureToken,
  hashToken,
} from "../common/crypto.util";
import { EmailService } from "./email.service";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {}

  async register(
    email: string,
  ): Promise<{ message: string; pollToken: string }> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: normalized, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.prisma.user.create({
      data: { email: normalized },
    });

    const issued = await this.sendMagicLinkForUser(user.id, normalized);
    return {
      message: "Magic link sent to your email",
      pollToken: issued.pollToken,
    };
  }

  async requestMagicLink(
    email: string,
  ): Promise<{ message: string; pollToken: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalized, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException("No account found for this email");
    }

    const issued = await this.sendMagicLinkForUser(user.id, normalized);
    return {
      message: "Magic link sent to your email",
      pollToken: issued.pollToken,
    };
  }

  async approveMagicLink(rawToken: string): Promise<{ message: string }> {
    const record = await this.findActiveMagicLink(rawToken);
    if (!record) {
      const approved = await this.prisma.magicLinkToken.findFirst({
        where: {
          tokenHash: hashToken(rawToken),
          approvedAt: { not: null },
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (approved) {
        return { message: "Sign-in already approved" };
      }
      throw new UnauthorizedException("Invalid or expired magic link");
    }

    if (!record.approvedAt) {
      await this.prisma.magicLinkToken.update({
        where: { id: record.id },
        data: { approvedAt: new Date() },
      });
    }

    return { message: "Sign-in approved" };
  }

  async getMagicLinkPollStatus(
    pollToken: string,
  ): Promise<"pending" | "approved" | "completed" | "expired"> {
    const pollHash = hashToken(pollToken);
    const record = await this.prisma.magicLinkToken.findFirst({
      where: { pollTokenHash: pollHash },
    });

    if (!record) {
      return "expired";
    }

    // Sign-in already finished — waiting tab should go to dashboard, not error.
    if (record.usedAt) {
      return "completed";
    }

    if (record.expiresAt <= new Date()) {
      return "expired";
    }

    if (record.approvedAt) {
      return "approved";
    }

    return "pending";
  }

  async completeMagicLinkPoll(
    pollToken: string,
  ): Promise<(AuthTokens & { userId: string }) | "pending"> {
    const pollHash = hashToken(pollToken);
    const record = await this.prisma.magicLinkToken.findFirst({
      where: { pollTokenHash: pollHash },
      include: { user: true },
    });

    if (!record || record.user.deletedAt) {
      throw new UnauthorizedException("Invalid or expired sign-in request");
    }

    // Already consumed (double finish / React Strict Mode) — re-issue session.
    if (record.usedAt) {
      const reusedWithinMs = Date.now() - record.usedAt.getTime();
      if (reusedWithinMs > 2 * 60 * 1000) {
        throw new UnauthorizedException("Invalid or expired sign-in request");
      }
      return this.issueSession(
        record.user.id,
        record.user.email,
        record.user.role,
      );
    }

    if (record.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid or expired sign-in request");
    }

    if (!record.approvedAt) {
      return "pending";
    }

    return this.consumeMagicLink(record);
  }

  async verifyMagicLink(rawToken: string): Promise<AuthTokens & { userId: string }> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.magicLinkToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record || record.user.deletedAt) {
      throw new UnauthorizedException("Invalid or expired magic link");
    }

    if (record.pollTokenHash && !record.approvedAt) {
      throw new UnauthorizedException("Sign-in not yet approved");
    }

    return this.consumeMagicLink(record);
  }

  async refreshSession(refreshToken: string): Promise<AuthTokens & { userId: string }> {
    let payload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null },
      },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException("Refresh token revoked or expired");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(refreshToken: string | undefined): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: "Logged out" };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  private async sendMagicLinkForUser(
    userId: string,
    email: string,
  ): Promise<{ pollToken: string }> {
    const rawToken = generateSecureToken();
    const pollToken = generateSecureToken();
    const ttlMinutes = this.config.get<number>("MAGIC_LINK_TTL_MINUTES", 15);
    const now = new Date();

    await this.prisma.magicLinkToken.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });

    await this.prisma.magicLinkToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        pollTokenHash: hashToken(pollToken),
        expiresAt: addMinutes(new Date(), ttlMinutes),
      },
    });

    const webUrl = this.config.getOrThrow<string>("WEB_APP_URL");
    const approveUrl = `${webUrl}/auth/approve?token=${encodeURIComponent(rawToken)}`;
    await this.emailService.sendMagicLink(email, approveUrl, { ttlMinutes });
    // Email-only approval token — never returned in API JSON.
    return { pollToken };
  }

  private async findActiveMagicLink(
    rawToken: string,
    options?: { includeUser?: boolean },
  ) {
    const tokenHash = hashToken(rawToken);
    return this.prisma.magicLinkToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: options?.includeUser ? { user: true } : undefined,
    });
  }

  private async consumeMagicLink(
    record: {
      id: string;
      userId: string;
      user: { id: string; email: string; role: string; deletedAt: Date | null };
    },
  ): Promise<AuthTokens & { userId: string }> {
    await this.prisma.$transaction([
      this.prisma.magicLinkToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    return this.issueSession(record.user.id, record.user.email, record.user.role);
  }

  private async issueSession(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens & { userId: string }> {
    const tokens = this.tokenService.createTokenPair(userId, email, role);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: addDays(new Date(), 7),
      },
    });

    return { ...tokens, userId };
  }
}
