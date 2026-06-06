import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '@prisma/client';

export class QuestionOptionDto {
  @IsString()
  @MaxLength(1000)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @MaxLength(5000)
  statement: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(100)
  points: number;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}
