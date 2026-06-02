import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachingPlansService } from './teaching-plans.service';
import { TeachingPlansController } from './teaching-plans.controller';
import { TeachingPlan } from './teaching-plan.entity';
import { SchoolsModule } from '../schools/schools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeachingPlan]),
    SchoolsModule,
    // CloudinaryModule é @Global — injetado automaticamente
  ],
  controllers: [TeachingPlansController],
  providers: [TeachingPlansService],
  exports: [TeachingPlansService],
})
export class TeachingPlansModule {}
