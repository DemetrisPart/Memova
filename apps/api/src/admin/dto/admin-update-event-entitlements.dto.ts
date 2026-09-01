import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ADMIN_ENTITLEMENTS } from "@momeva/shared";

export class AdminUpdateEventEntitlementsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ADMIN_ENTITLEMENTS.GALLERY_VISIBLE_DAYS_MIN)
  @Max(ADMIN_ENTITLEMENTS.GALLERY_VISIBLE_DAYS_MAX)
  galleryVisibleDays?: number;

  /** Storage ceiling in whole GB (20–100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ADMIN_ENTITLEMENTS.STORAGE_GB_DEFAULT)
  @Max(ADMIN_ENTITLEMENTS.STORAGE_GB_MAX)
  storageLimitGb?: number;
}
