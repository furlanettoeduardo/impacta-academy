import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class GradeAnswerDto {
  @IsUUID()
  answerId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  earnedPoints: number;
}

export class GradeSubmissionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  answers: GradeAnswerDto[];
}
