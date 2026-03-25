import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GradesModule } from './grades/grades.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FinanceModule } from './finance/finance.module';
import { ClassesModule } from './classes/classes.module';
import { School } from './schools/school.entity';
import { User } from './users/user.entity';
import { SchoolClass } from './classes/class.entity';
import { SchoolSubject } from './classes/subject.entity';
import { Grade } from './grades/grade.entity';
import { Attendance } from './attendance/attendance.entity';
import { Notification } from './notifications/notification.entity';
import { CashFlow } from './finance/cashflow.entity';
import { Tuition } from './finance/tuition.entity';
import { MetricsModule } from './metrics/metrics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './mail/mail.module';
import { AsaasModule } from './asaas/asaas.module';
import { SecretaryModule } from './secretary/secretary.module';
import { FeedModule } from './feed/feed.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { FeedPost } from './feed/feed-post.entity';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    MailModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [School, User, SchoolClass, SchoolSubject, Grade, Attendance, Notification, Tuition, CashFlow, FeedPost],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    SchoolsModule,
    UsersModule,
    AuthModule,
    GradesModule,
    AttendanceModule,
    NotificationsModule,
    FinanceModule,
    ClassesModule,
    MetricsModule,
    AsaasModule,
    SecretaryModule,
    CloudinaryModule,
    FeedModule,
    PlansModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }