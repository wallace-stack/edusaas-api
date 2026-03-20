import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // SSL obrigatório na porta 465
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get('MAIL_FROM', 'EduSaaS <facilclasse@gmail.com>'),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([School, User]),
  ],
  providers: [MailService, TrialScheduler],
  exports: [MailService],
})
export class MailModule {}