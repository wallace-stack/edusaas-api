import { IsEmail, IsString, IsOptional } from 'class-validator';

export class RegisterSchoolDto {
  @IsString()
  schoolName!: string;

  @IsString()
  cnpj!: string;

  @IsEmail()
  schoolEmail!: string;

  @IsString()
  directorName!: string;

  @IsEmail()
  directorEmail!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}