import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = 'https://sandbox.asaas.com/api/v3';
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY', '');
  }

  private headers() {
    return { 'access_token': this.apiKey, 'Content-Type': 'application/json' };
  }

  async createCustomer(name: string, email: string, cpfCnpj?: string): Promise<string> {
    const payload: any = { name, email };
    if (cpfCnpj) payload.cpfCnpj = cpfCnpj.replace(/\D/g, '');

    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/customers`, payload, { headers: this.headers() }),
    );

    this.logger.log(`[Asaas] Cliente criado: ${data.id}`);
    return data.id as string;
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<string> {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/subscriptions`, dto, { headers: this.headers() }),
    );

    this.logger.log(`[Asaas] Assinatura criada: ${data.id}`);
    return data.id as string;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/subscriptions/${subscriptionId}`, { headers: this.headers() }),
    );
    this.logger.log(`[Asaas] Assinatura cancelada: ${subscriptionId}`);
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, { headers: this.headers() }),
    );
    return data;
  }
}
