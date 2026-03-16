import { IsNumber, IsDateString, IsString, IsEnum, IsOptional, Min } from 'class-validator';
import { CashFlowType, CashFlowCategory } from '../cashflow.entity';

export class CreateCashFlowDto {
  @IsEnum(CashFlowType)
  type!: CashFlowType;

  @IsEnum(CashFlowCategory)
  category!: CashFlowCategory;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  description!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}