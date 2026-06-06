import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  statement?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(100)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}
