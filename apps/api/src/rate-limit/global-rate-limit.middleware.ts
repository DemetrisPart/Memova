import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import {
  getClientIp,
  isGlobalRateLimitExemptPath,
  isLoopbackClientIp,
} from "../common/client-ip.util";
import { RateLimitService } from "./rate-limit.service";

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimit: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.path.startsWith("/v1/health")) {
      next();
      return;
    }

    // Always enforce (incl. local LAN) so phone/dev testing matches production.
    // Loopback stays exempt so local tooling is not throttled.
    if (isGlobalRateLimitExemptPath(req.path)) {
      next();
      return;
    }

    const clientIp = getClientIp(req);
    if (isLoopbackClientIp(clientIp)) {
      next();
      return;
    }

    try {
      await this.rateLimit.assertGlobalApiLimit(clientIp);
      next();
    } catch (err) {
      next(err);
    }
  }
}
