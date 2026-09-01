import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { JwtAuthGuard } from "../auth/auth.guard";
import { AdminOpsService } from "./admin-ops.service";
import { PlatformAdminGuard } from "./platform-admin.guard";

class AdminFailuresQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@Controller("admin/ops")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminOpsController {
  constructor(private readonly adminOps: AdminOpsService) {}

  @Get("failures")
  listFailures(@Query() query: AdminFailuresQueryDto) {
    return this.adminOps.listRecentFailures(query.limit ?? 20);
  }

  @Get("storage-full")
  listStorageFull(@Query() query: AdminFailuresQueryDto) {
    return this.adminOps.listStorageFull(query.limit ?? 20);
  }
}
