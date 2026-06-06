import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SubmitAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  text?: string;
}

export class SubmitAssessmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}
