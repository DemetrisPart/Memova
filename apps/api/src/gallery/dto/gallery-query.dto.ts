import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GalleryQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class MediaUrlQueryDto {
  @IsOptional()
  @IsIn(["thumb", "web"])
  variant?: "thumb" | "web";
}

export class CoupleMediaUrlQueryDto {
  @IsOptional()
  @IsIn(["thumb", "web", "original"])
  variant?: "thumb" | "web" | "original";
}
