import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { GalleryModule } from "../gallery/gallery.module";
import { AdminEventsController } from "./admin-events.controller";
import { AdminEventsService } from "./admin-events.service";
import { PlatformAdminGuard } from "./platform-admin.guard";

@Module({
  imports: [AuthModule, EventsModule, GalleryModule],
  controllers: [AdminEventsController],
  providers: [AdminEventsService, PlatformAdminGuard],
})
export class AdminModule {}
