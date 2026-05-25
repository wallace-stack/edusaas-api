import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './webhook/asaas-webhook.controller';
import { SchoolsModule } from '../schools/schools.module';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/user.entity';

@Module({
  imports: [HttpModule, SchoolsModule, MailModule, TypeOrmModule.forFeature([User])],
  controllers: [AsaasWebhookController],
  providers: [AsaasService],
  exports: [AsaasService],
})
export class AsaasModule {}
