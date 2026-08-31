import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { getClientIp } from "../common/client-ip.util";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import { getGuestSessionTokenFromRequest } from "./guest-session.guard";
import { CreateGuestSessionDto } from "./dto/guest-session.dto";
import { GuestSessionsService } from "./guest-sessions.service";

@Controller("public/events")
export class GuestSessionsController {
  constructor(
    private readonly guestSessionsService: GuestSessionsService,
    private readonly rateLimit: RateLimitService,
    private readonly config: ConfigService,
  ) {}

  @Get(":slug/guest-session")
  async getSession(@Param("slug") slug: string, @Req() req: Request) {
    const token = getGuestSessionTokenFromRequest(req, this.config);
    if (!token) {
      return { active: false as const };
    }

    const session = await this.guestSessionsService.resolveSessionForSlug(
      token,
      slug,
    );

    if (!session) {
      return { active: false as const };
    }

    return {
      active: true as const,
      firstName: session.firstName,
      lastName: session.lastName,
    };
  }

  @Post(":slug/guest-session")
  async create(
    @Param("slug") slug: string,
    @Body() dto: CreateGuestSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.rateLimit.assertGuestSessionCreateLimit(getClientIp(req));

    const { session, sessionToken } =
      await this.guestSessionsService.createSession(
        slug,
        dto,
        getClientIp(req),
      );

    this.guestSessionsService.setGuestSessionCookie(res, sessionToken);

    const isProd = this.config.get("NODE_ENV") === "production";
    // Non-prod: also return token for Mobile Preview (iframe blocks cookies).
    return {
      firstName: session.firstName,
      lastName: session.lastName,
      expiresInHours: 24,
      ...(isProd ? {} : { sessionToken }),
    };
  }
}
