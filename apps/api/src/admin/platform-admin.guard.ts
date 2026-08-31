import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { JwtPayload } from "@momeva/domain";

type AuthenticatedRequest = Request & { user?: JwtPayload };

/** Requires JwtAuthGuard first — checks PLATFORM_ADMIN role. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user?.sub) {
      throw new UnauthorizedException("Authentication required");
    }
    if (user.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Platform admin access required");
    }
    return true;
  }
}
