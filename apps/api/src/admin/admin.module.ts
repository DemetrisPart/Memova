import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { GalleryModule } from "../gallery/gallery.module";
import { QueueModule } from "../queue/queue.module";
import { AdminEventsController } from "./admin-events.controller";
import { AdminEventsService } from "./admin-events.service";
import { AdminOpsController } from "./admin-ops.controller";
import { AdminOpsService } from "./admin-ops.service";
import { PlatformAdminGuard } from "./platform-admin.guard";

@Module({
  imports: [AuthModule, EventsModule, GalleryModule, QueueModule],
  controllers: [AdminEventsController, AdminOpsController],
  providers: [AdminEventsService, AdminOpsService, PlatformAdminGuard],
  exports: [AdminOpsService],
})
export class AdminModule {}
