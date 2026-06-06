import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  assessmentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAverageForCertificate?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(10)
  minAverage?: number;
}
