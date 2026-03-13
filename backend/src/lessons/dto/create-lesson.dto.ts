import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsUUID()
  moduleId: string;
}
