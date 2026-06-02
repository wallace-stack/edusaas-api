import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SystemMessageCategory } from '../system-message.entity';

export class CreateSystemMessageDto {
  @IsEnum(SystemMessageCategory)
  category!: SystemMessageCategory;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSystemMessageDto {
  @IsOptional()
  @IsEnum(SystemMessageCategory)
  category?: SystemMessageCategory;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  author?: string;
}
