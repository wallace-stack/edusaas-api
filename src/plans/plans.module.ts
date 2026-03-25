import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from '../schools/school.entity';
import { User } from '../users/user.entity';
import { PlanLimitsService } from './plan-limits.service';
import { PlansController } from './plans.controller';
import { SchoolsModule } from '../schools/schools.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, User]),
    SchoolsModule,
    AsaasModule,
  ],
  controllers: [PlansController],
  providers: [PlanLimitsService],
  exports: [PlanLimitsService],
})
export class PlansModule {}
