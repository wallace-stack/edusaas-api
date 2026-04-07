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
import { EnrollmentModule } from './enrollment/enrollment.module';
import { Enrollment } from './enrollment/enrollment.entity';
import { SeedModule } from './seed/seed.module'; // TODO: remover antes do MVP

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    MailModule,
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const libsql = require('libsql');
        const dbUrl = config.get<string>('TURSO_DATABASE_URL')
          || process.env.TURSO_DATABASE_URL;
        const authToken = config.get<string>('TURSO_AUTH_TOKEN')
          || process.env.TURSO_AUTH_TOKEN;

        console.log('DB URL:', dbUrl ? 'OK' : 'MISSING');
        console.log('AUTH TOKEN:', authToken ? `OK (${authToken.length} chars)` : 'MISSING');

        const allEnvKeys = Object.keys(process.env).filter(k => k.includes('TURSO'));
        console.log('=== TURSO ENV DEBUG ===');
        console.log('Keys encontradas:', allEnvKeys);
        console.log('TURSO_DATABASE_URL length:', (process.env.TURSO_DATABASE_URL || '').length);
        console.log('TURSO_AUTH_TOKEN length:', (process.env.TURSO_AUTH_TOKEN || '').length);
        console.log('TURSO_AUTH_TOKEN primeiros 20 chars:', (process.env.TURSO_AUTH_TOKEN || '').substring(0, 20));
        console.log('======================');

        return {
          type: 'better-sqlite3' as any,
          driver: libsql,
          database: dbUrl,
          driverOptions: {
            authToken: authToken,
          },
          synchronize: true,
          logging: false,
          autoLoadEntities: true,
        } as any;
      },
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
    EnrollmentModule,
    SeedModule, // TODO: remover antes do MVP
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }