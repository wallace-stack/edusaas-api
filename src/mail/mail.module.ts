import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { TrialScheduler } from './trial.scheduler';
import { School } from '../schools/school.entity';
import { User } from '../users/user.entity';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST', 'smtp.gmail.com'),
          port: +configService.get('MAIL_PORT', 587),
          tls: {
            rejectUnauthorized: false, 
          },
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get('MAIL_FROM', 'EduSaaS <noreply@edusaas.com>'),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([School, User]),
  ],
  providers: [MailService, TrialScheduler],
  exports: [MailService],
})
export class MailModule { }