import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PrivacyMode } from "@momeva/database";

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  brideName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  groomName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsDateString()
  eventDate!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  slug!: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  brideName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  groomName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsEnum(PrivacyMode)
  privacyMode?: PrivacyMode;

  @IsOptional()
  @IsBoolean()
  showGuestNamesPublicly?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyExpiry3d?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyFirstGuestPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyStorageNearFull?: boolean;
}

export class CoverUploadInitDto {
  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  contentLength!: number;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class CoverUploadCompleteDto {
  @IsString()
  mediaId!: string;
}
