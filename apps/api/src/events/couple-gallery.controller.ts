import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { GalleryQueryDto, CoupleMediaUrlQueryDto } from "../gallery/dto/gallery-query.dto";
import { GalleryService } from "../gallery/gallery.service";
import { EventOwnerGuard } from "./guards/event-owner.guard";

@Controller("events/:id/media")
@UseGuards(JwtAuthGuard, EventOwnerGuard)
export class CoupleGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  listMedia(@Param("id") eventId: string, @Query() query: GalleryQueryDto) {
    return this.galleryService.listCoupleGallery(eventId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(":mediaId/url")
  getMediaUrl(
    @Param("id") eventId: string,
    @Param("mediaId") mediaId: string,
    @Query() query: CoupleMediaUrlQueryDto,
  ) {
    return this.galleryService.getCoupleMediaUrl(
      eventId,
      mediaId,
      query.variant ?? "web",
    );
  }

  @Delete(":mediaId")
  deleteMedia(
    @Param("id") eventId: string,
    @Param("mediaId") mediaId: string,
  ) {
    return this.galleryService.deleteCoupleMedia(eventId, mediaId);
  }
}
