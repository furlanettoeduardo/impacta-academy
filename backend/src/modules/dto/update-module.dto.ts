import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateModuleDto {
	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsInt()
	@Min(1)
	order?: number;
}
