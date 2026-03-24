import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './webhook/asaas-webhook.controller';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [HttpModule, SchoolsModule],
  controllers: [AsaasWebhookController],
  providers: [AsaasService],
  exports: [AsaasService],
})
export class AsaasModule {}
