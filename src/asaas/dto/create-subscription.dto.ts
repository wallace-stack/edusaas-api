export class CreateSubscriptionDto {
  customer!: string;       // ID do cliente no Asaas
  billingType!: string;    // ex: 'CREDIT_CARD', 'BOLETO', 'PIX'
  value!: number;          // valor em reais
  nextDueDate!: string;    // data do primeiro vencimento (YYYY-MM-DD)
  cycle!: string;          // 'MONTHLY'
  description?: string;
}
