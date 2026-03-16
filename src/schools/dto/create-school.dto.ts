import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  name!: string;

  @IsString()
  cnpj!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}