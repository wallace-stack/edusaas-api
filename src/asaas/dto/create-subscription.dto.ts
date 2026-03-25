import { IsString, IsNumber, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  customer!: string;       // ID do cliente no Asaas

  @IsString()
  @IsNotEmpty()
  billingType!: string;    // ex: 'CREDIT_CARD', 'BOLETO', 'PIX'

  @IsNumber()
  value!: number;          // valor em reais

  @IsDateString()
  nextDueDate!: string;    // data do primeiro vencimento (YYYY-MM-DD)

  @IsString()
  @IsNotEmpty()
  cycle!: string;          // 'MONTHLY'

  @IsString()
  @IsOptional()
  description?: string;
}
