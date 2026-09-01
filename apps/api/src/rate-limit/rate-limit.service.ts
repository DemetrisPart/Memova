import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RATE_LIMITS } from "@momeva/shared";
import IORedis from "ioredis";

export class RateLimitExceededException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many requests. Please try again later.",
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly redis: IORedis;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.getOrThrow<string>("REDIS_URL");
    this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  }

  async assertWithinLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }

    if (count > limit) {
      const ttl = await this.redis.ttl(redisKey);
      throw new RateLimitExceededException(ttl > 0 ? ttl : windowSeconds);
    }
  }

  async assertGlobalApiLimit(clientIp: string): Promise<void> {
    const limit = this.config.get<number>(
      "RATE_LIMIT_API_GLOBAL_PER_IP_MINUTE",
      RATE_LIMITS.API_GLOBAL_PER_IP_MINUTE,
    );
    await this.assertWithinLimit(`api:global:${clientIp}`, limit, 60);
  }

  async assertGuestSessionCreateLimit(clientIp: string): Promise<void> {
    const limit = this.config.get<number>(
      "RATE_LIMIT_GUEST_SESSION_PER_IP_HOUR",
      RATE_LIMITS.GUEST_SESSION_CREATE_PER_IP_HOUR,
    );
    await this.assertWithinLimit(
      `guest-session:create:${clientIp}`,
      limit,
      3600,
    );
  }

  async assertUploadInitLimit(guestSessionId: string): Promise<void> {
    const limit = this.config.get<number>(
      "RATE_LIMIT_UPLOAD_INIT_PER_SESSION_HOUR",
      RATE_LIMITS.UPLOAD_INIT_PER_GUEST_SESSION_HOUR,
    );
    await this.assertWithinLimit(
      `upload:init:${guestSessionId}`,
      limit,
      3600,
    );
  }

  async assertUploadCompleteLimit(guestSessionId: string): Promise<void> {
    const limit = this.config.get<number>(
      "RATE_LIMIT_UPLOAD_COMPLETE_PER_SESSION_HOUR",
      RATE_LIMITS.UPLOAD_COMPLETE_PER_GUEST_SESSION_HOUR,
    );
    await this.assertWithinLimit(
      `upload:complete:${guestSessionId}`,
      limit,
      3600,
    );
  }

  async assertAuthMagicLinkLimit(clientIp: string): Promise<void> {
    const limit = this.config.get<number>(
      "RATE_LIMIT_AUTH_MAGIC_LINK_PER_IP_HOUR",
      RATE_LIMITS.AUTH_MAGIC_LINK_PER_IP_HOUR,
    );
    await this.assertWithinLimit(
      `auth:magic-link:${clientIp}`,
      limit,
      3600,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
