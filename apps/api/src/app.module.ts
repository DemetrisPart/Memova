import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { GlobalRateLimitMiddleware } from "./rate-limit/global-rate-limit.middleware";
import { RequestLoggingMiddleware } from "./middleware/request-logging.middleware";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicModule } from "./public/public.module";
import { QueueModule } from "./queue/queue.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { StorageModule } from "./storage/storage.module";
import { GalleryModule } from "./gallery/gallery.module";
import { UploadsModule } from "./uploads/uploads.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), "../../.env"),
        resolve(process.cwd(), ".env"),
      ],
    }),
    PrismaModule,
    StorageModule,
    QueueModule,
    RateLimitModule,
    AuthModule,
    EventsModule,
    PublicModule,
    UploadsModule,
    GalleryModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggingMiddleware, GlobalRateLimitMiddleware)
      .forRoutes("*");
  }
}
