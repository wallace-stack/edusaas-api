import { IsEmail, IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsString()
  @IsNotEmpty()
  guardianName!: string;

  @IsString()
  @IsNotEmpty()
  guardianPhone!: string;

  @IsString()
  @IsNotEmpty()
  guardianRelation!: string;

  @IsOptional()
  @IsNumber()
  classId?: number;
}
