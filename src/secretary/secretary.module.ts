import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretaryService } from './secretary.service';
import { SecretaryController } from './secretary.controller';
import { User } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';
import { Tuition } from '../finance/tuition.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { FinanceModule } from '../finance/finance.module';
import { SchoolsModule } from '../schools/schools.module';
import { PlansModule } from '../plans/plans.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SchoolClass, Tuition, Enrollment]),
    UsersModule,
    ClassesModule,
    FinanceModule,
    SchoolsModule,
    PlansModule,
    EnrollmentModule,
  ],
  controllers: [SecretaryController],
  providers: [SecretaryService],
})
export class SecretaryModule {}
