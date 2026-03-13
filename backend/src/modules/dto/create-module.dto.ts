import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsUUID()
  courseId: string;
}
