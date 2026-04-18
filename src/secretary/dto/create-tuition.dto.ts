import { IsNumber, IsDateString, IsOptional, IsString, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '../../finance/tuition.entity';

export class SecretaryCreateTuitionDto {
  @IsNumber()
  @Min(0, { message: 'Valor deve ser maior que zero.' })
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

export class SecretaryPayTuitionDto {
  @IsNumber()
  tuitionId!: number;

  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido.' })
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentNotes?: string;
}
