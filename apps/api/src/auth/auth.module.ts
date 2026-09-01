import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { RateLimitModule } from "../rate-limit/rate-limit.module";
import { AuthController } from "./auth.controller";
import { MeController } from "./me.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { TokenService } from "./token.service";
import { JwtAuthGuard } from "./auth.guard";

@Module({
  imports: [
    RateLimitModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, EmailService, TokenService, JwtAuthGuard],
  exports: [AuthService, TokenService, JwtAuthGuard, EmailService],
})
export class AuthModule {}
