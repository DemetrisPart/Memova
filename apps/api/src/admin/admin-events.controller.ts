import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsDateString, IsOptional } from "class-validator";
import { JwtAuthGuard } from "../auth/auth.guard";
import {
  CoupleMediaUrlQueryDto,
  GalleryQueryDto,
} from "../gallery/dto/gallery-query.dto";
import { AdminEventsService } from "./admin-events.service";
import { AdminUpdateEventEntitlementsDto } from "./dto/admin-update-event-entitlements.dto";
import { PlatformAdminGuard } from "./platform-admin.guard";

class AdminEventsListQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

@Controller("admin/events")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminEventsController {
  constructor(private readonly adminEvents: AdminEventsService) {}

  @Get()
  list(@Query() query: AdminEventsListQueryDto) {
    return this.adminEvents.listEvents({ date: query.date });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.adminEvents.getEvent(id);
  }

  @Patch(":id/entitlements")
  updateEntitlements(
    @Param("id") id: string,
    @Body() dto: AdminUpdateEventEntitlementsDto,
  ) {
    return this.adminEvents.updateEntitlements(id, dto);
  }

  @Get(":id/media")
  listMedia(@Param("id") id: string, @Query() query: GalleryQueryDto) {
    return this.adminEvents.listGallery(id, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(":id/media/:mediaId/url")
  mediaUrl(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @Query() query: CoupleMediaUrlQueryDto,
  ) {
    return this.adminEvents.getMediaUrl(
      id,
      mediaId,
      query.variant ?? "web",
    );
  }
}
