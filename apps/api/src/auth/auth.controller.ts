import { Controller, Post, Get, Query, Req, Res, UnauthorizedException, Body, HttpException, HttpStatus, HttpCode } from "@nestjs/common";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import {
  ApproveMagicLinkDto,
  MagicLinkDto,
  PollMagicLinkDto,
  RegisterDto,
  VerifyMagicLinkDto,
} from "./dto/auth.dto";
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from "./auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email);
  }

  @Post("magic-link")
  async magicLink(@Body() dto: MagicLinkDto) {
    return this.authService.requestMagicLink(dto.email);
  }

  @Post("approve")
  async approve(@Body() dto: ApproveMagicLinkDto) {
    return this.authService.approveMagicLink(dto.token);
  }

  @Post("magic-link/complete")
  @HttpCode(200)
  async completePoll(
    @Body() dto: PollMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.completeMagicLinkPoll(dto.pollToken);
    if (session === "pending") {
      throw new HttpException(
        { status: "pending", message: "Waiting for email approval" },
        HttpStatus.ACCEPTED,
      );
    }

    setAuthCookies(res, this.config, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    // Cookie-only session — never expose JWTs in JSON (production parity).
    return {
      message: "Authenticated",
      userId: session.userId,
    };
  }

  @Get("magic-link/status")
  magicLinkStatus(@Query("pollToken") pollToken: string) {
    if (!pollToken?.trim()) {
      throw new HttpException(
        { message: "pollToken required" },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.authService
      .getMagicLinkPollStatus(pollToken.trim())
      .then((status) => ({ status }));
  }

  @Post("verify")
  async verify(
    @Body() dto: VerifyMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.verifyMagicLink(dto.token);
    setAuthCookies(res, this.config, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return {
      message: "Authenticated",
      userId: session.userId,
    };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req, this.config);
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token");
    }
    const session = await this.authService.refreshSession(refreshToken);
    setAuthCookies(res, this.config, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return { message: "Session refreshed" };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req, this.config);
    clearAuthCookies(res, this.config);
    return this.authService.logout(refreshToken);
  }
}
