import { IsNumber, IsDateString, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '../tuition.entity';

export class CreateTuitionDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsNumber()
  studentId!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayTuitionDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}