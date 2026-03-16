import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateClassDto {
  @IsString()
  name!: string;

  @IsNumber()
  year!: number;

  @IsOptional()
  @IsString()
  period?: string;
}